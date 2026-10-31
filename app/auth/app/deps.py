"""Process-wide singletons and the FastAPI dependencies built on them.

Tests replace them with app.dependency_overrides, like get_db.
"""

import hmac
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import lru_cache

import jwt
import redis
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import avatars, domain, mail
from app import db as database
from app.config import settings
from app.db import get_db
from app.envelope import forbidden, unauthorized
from app.keys import KeyStore
from app.kv import KV, RedisKV
from app.otp import OtpService
from app.service import AuthService, parse_uuid
from app.tokens import TokenService

logger = logging.getLogger(__name__)
bearer = HTTPBearer(auto_error=False)
_mail_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="mail")


@lru_cache
def get_key_store() -> KeyStore:
    return KeyStore(
        lambda: database.SessionLocal(),
        rotation_interval=settings.key_rotation_interval,
        publish_lead=settings.key_publish_lead,
        retention=settings.key_retention,
        passphrase=settings.jwt_key_passphrase,
    )


@lru_cache
def get_kv() -> KV:
    return RedisKV(redis.Redis.from_url(settings.redis_url(), decode_responses=True))


@lru_cache
def get_sender() -> mail.Sender:
    if not settings.noti_queue_url:
        return mail.NoOpSender()
    return mail.SqsSender(settings.noti_queue_url, settings.noti_region)


@lru_cache
def get_avatar_storage() -> avatars.AvatarStorage | None:
    if not settings.avatar_bucket:
        return None
    return avatars.S3AvatarStorage(
        settings.avatar_bucket,
        settings.avatar_region,
        settings.avatar_url_ttl_seconds,
        settings.avatar_s3_endpoint,
        settings.avatar_s3_public_endpoint,
    )


def get_tokens(keys: KeyStore = Depends(get_key_store)) -> TokenService:
    return TokenService(keys, settings.access_ttl, settings.refresh_ttl)


def get_run_async():
    return _mail_pool.submit


def get_service(
    db: Session = Depends(get_db),
    kv: KV = Depends(get_kv),
    tokens: TokenService = Depends(get_tokens),
    sender: mail.Sender = Depends(get_sender),
    run_async=Depends(get_run_async),
    storage: avatars.AvatarStorage | None = Depends(get_avatar_storage),
) -> AuthService:
    otp = OtpService(kv, settings.test_email_list)
    return AuthService(db, kv, tokens, otp, sender, run_async, avatar_storage=storage)


@dataclass(frozen=True)
class Principal:
    """The authenticated caller taken from the access token."""

    user_id: str
    email: str
    role: str
    plan: str


def authenticate(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    tokens: TokenService = Depends(get_tokens),
) -> Principal:
    """Requires a valid Bearer access token."""
    if credentials is None or not credentials.credentials:
        raise unauthorized("You must be logged in to access this resource.")
    try:
        claims = tokens.parse(credentials.credentials)
    except jwt.PyJWTError as exc:
        logger.warning(
            "JWT authentication failed with exception %s and message: %s",
            type(exc).__name__,
            exc,
        )
        raise unauthorized("EXPIRED_OR_INVALID_JWT") from None
    user_id = str(claims.get("id", ""))
    if parse_uuid(user_id) is None:
        raise unauthorized("EXPIRED_OR_INVALID_JWT")
    return Principal(
        user_id, claims.get("sub", ""), claims.get("role", ""), claims.get("plan", "")
    )


def optional_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    tokens: TokenService = Depends(get_tokens),
) -> Principal | None:
    """None for a visitor without a token; a bad token is still rejected."""
    if credentials is None or not credentials.credentials:
        return None
    return authenticate(credentials, tokens)


def require_role(*roles: str):
    def check(principal: Principal = Depends(authenticate)) -> Principal:
        if principal.role not in roles:
            raise forbidden("You do not have permission to access this resource.")
        return principal

    return check


def require_plan(minimum: str):
    def check(principal: Principal = Depends(authenticate)) -> Principal:
        if not domain.plan_at_least(principal.plan, minimum):
            raise forbidden("Your subscription plan does not include this resource.")
        return principal

    return check


def internal_only(x_internal_key: str | None = Header(default=None)) -> None:
    """Guards service-to-service routes; an empty configured key rejects everything."""
    expected = settings.internal_api_key
    if not expected or not hmac.compare_digest(
        (x_internal_key or "").encode(), expected.encode()
    ):
        raise forbidden("Forbidden")

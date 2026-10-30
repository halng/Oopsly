"""Authentication, profile and subscription use cases."""

import json
import logging
import re
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import jsonpatch
import jwt
from pydantic import BaseModel, ConfigDict, StrictInt, StrictStr, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import avatars, domain, features, mail, reminder
from app.envelope import ApiError, bad_request, not_found, unauthorized
from app.kv import KV
from app.models import Settings, Subscription, User
from app.otp import OtpService, OtpStatus
from app.tokens import TokenService

logger = logging.getLogger(__name__)

TOKEN_TYPE_BEARER = "Bearer"
REFRESH_TOKEN_KEY_PREFIX = "refresh_token:"
REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 3600
MAX_LOOKUP_IDS = 200
MAX_DISPLAY_NAME, MAX_BIO = 50, 255
MIN_AGE, MAX_AGE = 1, 120
MAX_NAME, MAX_PICTURE_URL = 255, 500

EMAIL_RE = re.compile(r"^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$")
PATCHABLE_FIELDS = {"name", "displayName", "bio", "age", "pictureUrl"}


def valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email))


def parse_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return None


class _Patchable(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    name: StrictStr
    displayName: StrictStr
    bio: StrictStr
    age: StrictInt | None
    pictureUrl: StrictStr


def _auth_res(access: str, refresh: str) -> dict:
    return {"access_token": access, "refresh_token": refresh, "type": TOKEN_TYPE_BEARER}


def _validate_profile_fields(display_name: str, bio: str, age: int | None) -> None:
    if not display_name.strip():
        raise bad_request("Display name cannot be blank")
    if len(display_name) > MAX_DISPLAY_NAME:
        raise bad_request("Display name must not exceed 50 characters")
    if len(bio) > MAX_BIO:
        raise bad_request("Bio must not exceed 255 characters")
    if age is not None and age < MIN_AGE:
        raise bad_request("Age must be at least 1")
    if age is not None and age > MAX_AGE:
        raise bad_request("Age must not exceed 120")


def _check_patch_paths(ops: Any) -> None:
    failed = bad_request("Failed to apply JSON patch")
    if not isinstance(ops, list) or not all(isinstance(op, dict) for op in ops):
        raise failed
    for op in ops:
        for k in ("path", "from"):
            if k not in op:
                continue
            path = op[k]
            if (
                not isinstance(path, str)
                or not path.startswith("/")
                or path[1:].split("/", 1)[0] not in PATCHABLE_FIELDS
            ):
                raise failed


class AuthService:
    def __init__(
        self,
        db: Session,
        kv: KV,
        tokens: TokenService,
        otp: OtpService,
        sender: mail.Sender,
        run_async: Callable[[Callable[[], None]], Any],
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        avatar_storage: avatars.AvatarStorage | None = None,
    ):
        self.db = db
        self.kv = kv
        self.tokens = tokens
        self.otp = otp
        self.sender = sender
        self.run_async = run_async
        self.now = now
        self.avatar_storage = avatar_storage

    # --- authentication ---

    def send_otp(self, email: str) -> None:
        """Creates and mails a code (skipped for configured test emails)."""
        if not valid_email(email):
            raise bad_request("Invalid Email Format")
        if self.otp.is_test_email(email):
            return
        code = self.otp.issue(email)

        def deliver() -> None:
            try:
                self.sender.send_otp(email, code)
            except Exception:
                logger.exception("failed to send OTP email to %s", mail.mask(email))

        self.run_async(deliver)

    def verify_otp(self, email: str, code: str, name: str) -> dict:
        """Validates the code and, on success, creates the user if needed."""
        if not valid_email(email) or len(code) < 6:
            raise bad_request("Invalid request body")
        status = self.otp.verify(email, code)
        if status is not OtpStatus.VALID:
            logger.warning("OTP rejected for %s: %s", mail.mask(email), status.value)
        if status is OtpStatus.INVALID:
            raise bad_request("OTP is invalid. Please try again.")
        if status is OtpStatus.EXPIRED:
            raise not_found("OTP has expired. Please request a new one.")
        if status is OtpStatus.INVALIDATED:
            raise ApiError(
                429,
                "OTP has been invalidated due to too many failed attempts. "
                "Try again after 5 minutes.",
            )
        user = self._find_user_by_email(email)
        if user is None:
            user = self._create_user(email, name or email.split("@", 1)[0])
            logger.info("user %s signed up", mail.mask(email))
        logger.info("user %s logged in", mail.mask(email))
        return self._issue_tokens(user)

    def refresh(self, refresh_token: str, email: str) -> dict:
        """Issues a new access token for a valid, stored refresh token."""
        if not refresh_token:
            raise bad_request("Refresh token is required")
        if not valid_email(email):
            raise bad_request("Invalid email format")
        try:
            claims = self.tokens.parse(refresh_token)
        except jwt.PyJWTError:
            claims = None
        if claims is None or claims.get("sub", "").lower() != email.lower():
            logger.warning("refresh rejected for %s: bad token", mail.mask(email))
            raise unauthorized("Invalid or expired refresh token")
        user = self._find_user_by_email(email)
        if user is None:
            raise unauthorized("User not found with email: " + email)
        if self.kv.get(REFRESH_TOKEN_KEY_PREFIX + str(user.id)) != refresh_token:
            logger.warning("refresh rejected for %s: token revoked", mail.mask(email))
            raise unauthorized("Invalid refresh token")
        access = self.tokens.access_token(
            str(user.id), user.email, user.role, self._plan(user.id)
        )
        return _auth_res(access, refresh_token)

    def logout(self, user_id: str) -> None:
        self.kv.delete(REFRESH_TOKEN_KEY_PREFIX + user_id)
        logger.info("user %s logged out", user_id)

    def validate_token(self, user_id: str) -> None:
        """Confirms the token's user still exists."""
        self._current_user(user_id)

    def _issue_tokens(self, user: User) -> dict:
        access = self.tokens.access_token(
            str(user.id), user.email, user.role, self._plan(user.id)
        )
        refresh = self.tokens.refresh_token(user.email)
        self.kv.set(
            REFRESH_TOKEN_KEY_PREFIX + str(user.id), refresh, REFRESH_TOKEN_TTL_SECONDS
        )
        return _auth_res(access, refresh)

    def _plan(self, user_id: uuid.UUID) -> str:
        sub = self.db.get(Subscription, user_id)
        if sub is None:
            return domain.PLAN_FREE
        return domain.effective_subscription(
            sub.plan, sub.status, sub.expires_at, self.now()
        )[0]

    # --- users ---

    def _find_user_by_email(self, email: str) -> User | None:
        return self.db.scalars(
            select(User).where(func.lower(User.email) == email.lower(), ~User.deleted)
        ).first()

    def _create_user(self, email: str, name: str) -> User:
        user = User(email=email, name=name, display_name=name, role=domain.ROLE_USER)
        self.db.add(user)
        self.db.flush()
        self.db.add(Subscription(user_id=user.id))
        self.db.commit()
        return user

    def _current_user(self, user_id: str) -> User:
        parsed = parse_uuid(user_id)
        user = self.db.get(User, parsed) if parsed else None
        if user is None or user.deleted:
            raise unauthorized("User not found")
        return user

    # --- profile ---

    def _picture(self, stored: str | None) -> str:
        """A displayable URL for the stored picture (presigned for our own keys)."""
        if not avatars.is_key(stored):
            return stored or ""
        return self.avatar_storage.presign_get(stored) if self.avatar_storage else ""

    def _require_avatars(self) -> avatars.AvatarStorage:
        if self.avatar_storage is None:
            raise ApiError(503, "Profile picture uploads are not available")
        return self.avatar_storage

    def request_avatar_upload(self, user_id: str, content_type: str) -> dict:
        """A short-lived form the browser posts the image to, straight to S3."""
        storage = self._require_avatars()
        if content_type not in avatars.ALLOWED_TYPES:
            raise bad_request("Picture must be a JPEG, PNG or WebP image")
        user = self._current_user(user_id)
        key = avatars.new_key(str(user.id), content_type)
        upload = storage.presign_upload(key, content_type)
        return {**upload, "key": key, "maxBytes": avatars.MAX_BYTES}

    def confirm_avatar(self, user_id: str, key: str) -> dict:
        """Makes an uploaded object the user's picture and drops the previous one."""
        storage = self._require_avatars()
        user = self._current_user(user_id)
        if not key.startswith(avatars.user_prefix(str(user.id))):
            raise bad_request("Invalid picture")
        if not storage.exists(key):
            raise bad_request("Picture was not uploaded")
        previous = user.picture_url
        user.picture_url = key
        user.updated_at = self.now()
        self.db.commit()
        if avatars.is_key(previous) and previous != key:
            try:
                storage.delete(previous)
            except Exception:
                logger.warning("could not delete previous avatar", exc_info=True)
        return self.profile(user_id)

    def _ensure_settings(self, user_id: uuid.UUID) -> Settings:
        settings = self.db.scalars(
            select(Settings).where(Settings.user_id == user_id)
        ).first()
        if settings is None:
            settings = Settings(user_id=user_id)
            self.db.add(settings)
            self.db.commit()
        return settings

    def profile(self, user_id: str) -> dict:
        user = self._current_user(user_id)
        st = self._ensure_settings(user.id)
        # Progress fields are placeholders: real progress is owned by the API service.
        return {
            "name": user.name or "",
            "email": user.email,
            "displayName": user.display_name or "",
            "avatarUrl": self._picture(user.picture_url),
            "bio": user.bio or "",
            "settings": {
                "theme": st.theme,
                "language": domain.language_code(st.language),
                "dailyGoal": st.daily_goal,
                "soundEffects": True,
                "hapticFeedback": True,
                "autoPlayAudio": True,
                "fsrsTargetRetention": 0.95,
                "targetRetentionRate": 0.95,
                "allowReminders": True,
                "isNewComer": st.is_new_comer,
            },
            "xp": 100,
            "streakDays": 5,
            "totalCardsStudied": 200,
            "totalReviews": 50,
            "retentionRate": 0.85,
            "league": "GOLD",
        }

    def update_profile(
        self, user_id: str, display_name: str, bio: str, age: int | None
    ) -> dict:
        _validate_profile_fields(display_name, bio, age)
        user = self._current_user(user_id)
        user.display_name, user.bio, user.age = display_name, bio, age
        user.updated_at = self.now()
        self.db.commit()
        return self.profile(user_id)

    def update_settings(self, user_id: str, req: dict) -> dict:
        theme_in, language_in = req.get("theme"), req.get("language")
        if not isinstance(theme_in, str) or not theme_in.strip():
            raise bad_request("Theme cannot be blank")
        if not isinstance(language_in, str) or not language_in.strip():
            raise bad_request("Language cannot be blank")
        if req.get("spaceConfig") is None:
            raise bad_request("Space configuration cannot be null")
        if req.get("studySchedule") is None:
            raise bad_request("Study schedule cannot be null")
        theme = domain.parse_theme(theme_in)
        if theme is None:
            raise bad_request("Invalid theme: " + theme_in)
        language = domain.parse_language(language_in)
        if language is None:
            raise bad_request("Invalid language: " + language_in)
        user = self._current_user(user_id)
        st = self._ensure_settings(user.id)
        st.theme, st.language, st.updated_at = theme, language, self.now()
        self.db.commit()
        return self.profile(user_id)

    def study_reminder_ics(self, days: list[int], time: str, timezone: str) -> str:
        """The recurring study event as an iCalendar file body."""
        try:
            return reminder.build_ics(days, time, timezone, self.now())
        except reminder.InvalidReminder as e:
            raise bad_request(str(e)) from None

    def send_study_reminder(
        self, user_id: str, days: list[int], time: str, timezone: str
    ) -> None:
        """Emails the user a recurring calendar event for their study days."""
        ics = self.study_reminder_ics(days, time, timezone)
        to = self._current_user(user_id).email

        def deliver() -> None:
            try:
                self.sender.send_study_reminder(to, ics)
            except Exception:
                logger.exception("failed to send study reminder to %s", mail.mask(to))

        self.run_async(deliver)

    def mark_not_newcomer(self, user_id: str) -> None:
        user = self._current_user(user_id)
        st = self.db.scalars(
            select(Settings).where(Settings.user_id == user.id)
        ).first()
        if st is None:
            raise bad_request(f"Setting not found for user: {user.id}")
        st.is_new_comer, st.updated_at = False, self.now()
        self.db.commit()

    def patch_profile(self, user_id: str, raw_patch: bytes) -> dict:
        failed = bad_request("Failed to apply JSON patch")
        try:
            ops = json.loads(raw_patch)
        except ValueError:
            raise failed from None
        _check_patch_paths(ops)
        user = self._current_user(user_id)
        target = {
            "name": user.name or "",
            "displayName": user.display_name or "",
            "bio": user.bio or "",
            "age": user.age,
            "pictureUrl": user.picture_url or "",
        }
        try:
            patched = jsonpatch.JsonPatch(ops).apply(target)
            fields = _Patchable.model_validate(patched)
        except (jsonpatch.JsonPatchException, ValidationError, TypeError):
            raise failed from None
        try:
            _validate_profile_fields(fields.displayName, fields.bio, fields.age)
        except ApiError as exc:
            raise bad_request("Validation failed: " + exc.message) from None
        if len(fields.name) > MAX_NAME or len(fields.pictureUrl) > MAX_PICTURE_URL:
            raise bad_request("Validation failed: value too long")
        # Object keys are only ever set through confirm_avatar; a patch may keep the
        # current one but must not point at someone else's picture.
        if avatars.is_key(fields.pictureUrl) and fields.pictureUrl != (
            user.picture_url or ""
        ):
            raise bad_request("Validation failed: invalid picture")
        user.name, user.display_name, user.bio = (
            fields.name,
            fields.displayName,
            fields.bio,
        )
        user.age, user.picture_url = fields.age, fields.pictureUrl
        user.updated_at = self.now()
        self.db.commit()
        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "displayName": user.display_name,
            "pictureUrl": self._picture(user.picture_url),
            "bio": user.bio,
            "age": user.age,
        }

    # --- subscription ---

    @staticmethod
    def _subscription_view(plan, status, expires_at) -> dict:
        return {"plan": plan, "status": status, "expiresAt": expires_at}

    def subscription(self, user_id: str) -> dict:
        parsed = parse_uuid(user_id)
        sub = self.db.get(Subscription, parsed) if parsed else None
        plan, status, expires_at = domain.effective_subscription(
            sub.plan if sub else None,
            sub.status if sub else None,
            sub.expires_at if sub else None,
            self.now(),
        )
        return self._subscription_view(plan, status, expires_at)

    def features(self, user_id: str | None) -> dict:
        plan = self.subscription(user_id)["plan"] if user_id else None
        return {
            "plan": plan,
            "features": {f.key: features.resolve(f, plan) for f in features.FEATURES},
        }

    def feature(self, user_id: str | None, key: str) -> dict:
        feature = features.find(key)
        if feature is None:
            raise not_found("Feature not found: " + key)
        plan = self.subscription(user_id)["plan"] if user_id else None
        return {"key": key, **features.resolve(feature, plan), "plan": plan}

    def set_subscription(
        self, user_id: str, plan: str, expires_at: datetime | None
    ) -> dict:
        parsed = parse_uuid(user_id)
        if parsed is None:
            raise bad_request("Invalid user id")
        if not domain.valid_plan(plan):
            raise bad_request("Invalid plan: " + plan)
        user = self.db.get(User, parsed)
        if user is None or user.deleted:
            raise not_found("User not found")
        sub = self.db.get(Subscription, parsed)
        now = self.now()
        if sub is None:
            sub = Subscription(user_id=parsed, started_at=now)
            self.db.add(sub)
        elif sub.plan != plan:
            sub.started_at = now
        sub.plan, sub.status, sub.expires_at = plan, domain.STATUS_ACTIVE, expires_at
        self.db.commit()
        return self._subscription_view(plan, domain.STATUS_ACTIVE, expires_at)

    # --- internal lookup ---

    def lookup_users(self, ids: list[str]) -> list[dict]:
        if not ids:
            return []
        if len(ids) > MAX_LOOKUP_IDS:
            raise bad_request("Too many ids (max 200)")
        parsed = []
        for raw in ids:
            value = parse_uuid(raw)
            if value is None:
                raise bad_request("Invalid id: " + str(raw))
            parsed.append(value)
        rows = self.db.execute(
            select(User, Settings.daily_goal)
            .outerjoin(Settings, Settings.user_id == User.id)
            .where(User.id.in_(parsed), ~User.deleted)
        ).all()
        return [
            {
                "id": str(user.id),
                "name": user.name or "",
                "displayName": user.display_name or "",
                "pictureUrl": self._picture(user.picture_url),
                "dailyGoal": goal if goal is not None else 20,
            }
            for user, goal in rows
        ]

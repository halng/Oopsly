"""Issues and verifies RS256 tokens. Access tokens carry sub (email), id, role, plan,
iat and exp; every token header carries the kid of the signing key."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import jwt

from app.keys import ALGORITHM, KeyStore


class TokenService:
    def __init__(
        self,
        keys: KeyStore,
        access_ttl: timedelta,
        refresh_ttl: timedelta,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
    ):
        self._keys = keys
        self._access_ttl = access_ttl
        self._refresh_ttl = refresh_ttl
        self._now = now

    def _sign(self, claims: dict, ttl: timedelta) -> str:
        now = self._now()
        kid, key = self._keys.signing_key()
        payload = {
            **claims,
            "iat": int(now.timestamp()),
            "exp": int((now + ttl).timestamp()),
        }
        return jwt.encode(payload, key, algorithm=ALGORITHM, headers={"kid": kid})

    def access_token(self, user_id: str, email: str, role: str, plan: str) -> str:
        claims = {"sub": email, "id": user_id, "role": role, "plan": plan}
        return self._sign(claims, self._access_ttl)

    def refresh_token(self, email: str) -> str:
        # jti keeps two refresh tokens issued in the same second distinct.
        return self._sign({"sub": email, "jti": str(uuid.uuid4())}, self._refresh_ttl)

    def parse(self, token: str) -> dict:
        """Verifies signature and expiry and returns the claims."""
        header = jwt.get_unverified_header(token)
        if header.get("alg") != ALGORITHM:
            raise jwt.InvalidAlgorithmError("only RS256 tokens are accepted")
        kid = header.get("kid")
        public_key = self._keys.public_key(kid) if kid else None
        if public_key is None:
            raise jwt.InvalidKeyError("unknown signing key")
        return jwt.decode(
            token,
            public_key,
            algorithms=[ALGORITHM],
            options={"require": ["exp"]},
            leeway=0,
        )

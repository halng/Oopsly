"""Stands in for the auth service by signing tokens the way it does (HS384, shared secret)."""

from __future__ import annotations

import base64
import time
import uuid

import jwt


def user_id(email: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, email))


def mint_token(email: str, secret: str, plan: str = "FREE", ttl_seconds: int = 3600) -> str:
    """Access token carrying the claims the API reads: id, role, plan and the email as subject."""
    now = int(time.time())
    key = base64.b64decode(secret + "=" * (-len(secret) % 4))
    claims = {
        "id": user_id(email),
        "role": "USER",
        "plan": plan,
        "sub": email,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(claims, key, algorithm="HS384")

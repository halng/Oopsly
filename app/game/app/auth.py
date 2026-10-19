import base64
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthResult:
    user_id: str
    email: str | None
    role: str | None

    def as_dict(self) -> dict:
        return {"userId": self.user_id, "email": self.email, "role": self.role}


def signing_key() -> bytes:
    """HMAC key shared with the Java API, which Base64-decodes JWT_SECRET."""
    secret = settings.jwt_secret
    padded = secret + "=" * (-len(secret) % 4)
    return base64.b64decode(padded)


def verification_material() -> tuple[bytes | str, list[str]]:
    """Public key when configured, otherwise the shared HMAC secret."""
    public_key = (settings.jwt_public_key or "").strip()
    if public_key:
        return public_key, ["RS256"]
    return signing_key(), ["HS256"]


def verify_access_token(token: str) -> AuthResult:
    key, algorithms = verification_material()
    payload = jwt.decode(token, key, algorithms=algorithms)
    user_id = payload.get("id")
    if not user_id:
        raise jwt.InvalidTokenError("missing id")
    return AuthResult(
        user_id=str(user_id),
        email=payload.get("sub"),
        role=payload.get("role"),
    )


def current_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> AuthResult:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="You must be logged in")
    try:
        return verify_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="You must be logged in") from exc


def current_user_id(auth: AuthResult = Depends(current_auth)) -> str:
    return auth.user_id

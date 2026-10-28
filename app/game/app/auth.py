from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.jwks import JwksCache

bearer = HTTPBearer(auto_error=False)
jwks = JwksCache(settings.jwks_url)


@dataclass(frozen=True)
class AuthResult:
    user_id: str
    email: str | None
    role: str | None

    def as_dict(self) -> dict:
        return {"userId": self.user_id, "email": self.email, "role": self.role}


def verify_access_token(token: str) -> AuthResult:
    kid = jwt.get_unverified_header(token).get("kid")
    payload = jwt.decode(
        token,
        jwks.get_key(kid),
        algorithms=["RS256"],
        options={"require": ["exp"]},
    )
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

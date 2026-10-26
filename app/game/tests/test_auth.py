import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.auth import signing_key, verify_access_token
from app.config import settings
from app.main import app


def _token(**claims):
    payload = {"exp": int(time.time()) + 60, **claims}
    return jwt.encode(payload, signing_key(), algorithm="HS256")


def test_java_hs384_access_token_verifies():
    token = jwt.encode(
        {
            "id": "user-9",
            "sub": "test@oopsly.com",
            "role": "USER",
            "exp": int(time.time()) + 60,
        },
        signing_key(),
        algorithm="HS384",
    )
    result = verify_access_token(token)
    assert result.user_id == "user-9"
    assert result.email == "test@oopsly.com"
    assert result.role == "USER"


def test_verify_returns_id_email_and_role():
    result = verify_access_token(
        _token(id="user-9", sub="learner@oopsly.app", role="USER")
    )
    assert result.as_dict() == {
        "userId": "user-9",
        "email": "learner@oopsly.app",
        "role": "USER",
    }


def test_verify_rejects_expired_bad_signature_and_missing_id():
    expired = jwt.encode(
        {"id": "user-9", "sub": "learner@oopsly.app", "exp": int(time.time()) - 10},
        signing_key(),
        algorithm="HS256",
    )
    forged = jwt.encode(
        {"id": "user-9", "exp": int(time.time()) + 60},
        b"not-the-shared-secret-key-at-least-32b",
        algorithm="HS256",
    )
    nameless = _token(sub="learner@oopsly.app")
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(expired)
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(forged)
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(nameless)
    with pytest.raises(jwt.PyJWTError):
        verify_access_token("not-a-token")


def test_session_route_returns_the_verified_result(session_factory):
    token = _token(id="user-9", sub="learner@oopsly.app", role="USER")
    with TestClient(app) as client:
        missing = client.get("/v1/game/session")
        assert missing.status_code == 401
        assert missing.json()["message"] == "You must be logged in"

        forged = client.get(
            "/v1/game/session",
            headers={"Authorization": "Bearer not-a-token"},
        )
        assert forged.status_code == 401

        ok = client.get(
            "/v1/game/session",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert ok.status_code == 200
    assert ok.json()["data"] == {
        "userId": "user-9",
        "email": "learner@oopsly.app",
        "role": "USER",
    }


def test_public_key_verifies_rs256_and_rejects_the_shared_secret(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    monkeypatch.setattr(settings, "jwt_public_key", public_pem.decode())
    signed = jwt.encode(
        {
            "id": "user-3",
            "sub": "learner@oopsly.app",
            "role": "USER",
            "exp": int(time.time()) + 60,
        },
        private_pem,
        algorithm="RS256",
    )
    result = verify_access_token(signed)
    assert result.user_id == "user-3"
    assert result.email == "learner@oopsly.app"

    hmac_token = _token(id="user-3", sub="learner@oopsly.app", role="USER")
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(hmac_token)


def test_socket_rejects_a_missing_token(session_factory):
    with (
        TestClient(app) as client,
        client.websocket_connect("/v1/game/ws") as socket,
    ):
        denied = socket.receive_json()
        assert denied["type"] == "error"
        assert denied["isSuccess"] is False


def test_socket_rejects_a_bad_token(session_factory):
    with (
        TestClient(app) as client,
        client.websocket_connect("/v1/game/ws?token=not-a-token") as socket,
    ):
        denied = socket.receive_json()
        assert denied["type"] == "error"
        assert denied["message"] == "You must be logged in"

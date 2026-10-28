import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth import verify_access_token
from app.jwks import JwksCache
from app.main import app
from tests.tokens import jwk_for, new_key, sign


class FakeJwks:
    def __init__(self, *keys, fail=False):
        self.keys = list(keys)
        self.fail = fail
        self.calls = 0

    def __call__(self, url, timeout):
        self.calls += 1
        if self.fail:
            raise RuntimeError("auth service down")
        return {"keys": [jwk_for(key, kid) for kid, key in self.keys]}


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_access_token_verifies(make_token):
    result = verify_access_token(
        make_token(id="user-9", sub="test@oopsly.com", role="USER")
    )
    assert result.as_dict() == {
        "userId": "user-9",
        "email": "test@oopsly.com",
        "role": "USER",
    }


def test_verify_rejects_expired_forged_and_missing_id(rsa_key, make_token):
    expired = sign(rsa_key, id="user-9", exp=int(time.time()) - 10)
    forged = sign(new_key(), id="user-9")
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(expired)
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(forged)
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(make_token(sub="learner@oopsly.app"))
    with pytest.raises(jwt.PyJWTError):
        verify_access_token("not-a-token")


def test_verify_requires_exp(rsa_key):
    token = jwt.encode(
        {"id": "user-9"}, rsa_key, algorithm="RS256", headers={"kid": "test-key"}
    )
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(token)


def test_hmac_tokens_are_rejected(rsa_key):
    public_pem = jwk_for(rsa_key)["n"]
    hs = jwt.encode(
        {"id": "user-9", "exp": int(time.time()) + 60},
        public_pem * 4,
        algorithm="HS256",
        headers={"kid": "test-key"},
    )
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(hs)


def test_alg_none_is_rejected():
    token = jwt.encode(
        {"id": "user-9", "exp": int(time.time()) + 60},
        None,
        algorithm="none",
        headers={"kid": "test-key"},
    )
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(token)


def test_token_without_kid_is_rejected(rsa_key):
    token = jwt.encode(
        {"id": "user-9", "exp": int(time.time()) + 60}, rsa_key, algorithm="RS256"
    )
    with pytest.raises(jwt.PyJWTError):
        verify_access_token(token)


def test_first_lookup_fetches_then_serves_from_memory():
    key = new_key()
    fetch = FakeJwks(("a", key))
    cache = JwksCache("http://x", fetch=fetch)
    assert fetch.calls == 0
    cache.get_key("a")
    cache.get_key("a")
    assert fetch.calls == 1


def test_unknown_kid_refetches_once_per_cooldown():
    old, new = new_key(), new_key()
    clock = Clock()
    fetch = FakeJwks(("old", old))
    cache = JwksCache("http://x", min_refetch_seconds=30, fetch=fetch, clock=clock)
    cache.get_key("old")

    fetch.keys = [("old", old), ("new", new)]
    with pytest.raises(jwt.InvalidTokenError):
        cache.get_key("new")
    assert fetch.calls == 1

    clock.now += 31
    cache.get_key("new")
    assert fetch.calls == 2

    for _ in range(3):
        with pytest.raises(jwt.InvalidTokenError):
            cache.get_key("random")
    assert fetch.calls == 2

    clock.now += 31
    with pytest.raises(jwt.InvalidTokenError):
        cache.get_key("random")
    assert fetch.calls == 3


def test_refetch_after_rotation_picks_up_new_key():
    old, new = new_key(), new_key()
    clock = Clock()
    fetch = FakeJwks(("old", old))
    cache = JwksCache("http://x", min_refetch_seconds=30, fetch=fetch, clock=clock)
    cache.get_key("old")
    fetch.keys = [("new", new)]
    clock.now += 60
    cache.get_key("new")
    assert fetch.calls == 2


def test_failed_fetch_keeps_serving_stale_keys():
    key = new_key()
    clock = Clock()
    fetch = FakeJwks(("a", key))
    cache = JwksCache("http://x", min_refetch_seconds=30, fetch=fetch, clock=clock)
    cache.get_key("a")
    fetch.fail = True
    clock.now += 60
    with pytest.raises(jwt.InvalidTokenError):
        cache.get_key("b")
    assert cache.get_key("a") is not None


def test_fetch_failure_on_empty_cache_rejects():
    cache = JwksCache("http://x", fetch=FakeJwks(fail=True))
    with pytest.raises(jwt.InvalidTokenError):
        cache.get_key("a")


def test_missing_kid_is_rejected():
    cache = JwksCache("http://x", fetch=FakeJwks())
    with pytest.raises(jwt.InvalidTokenError):
        cache.get_key(None)


def test_session_route_returns_the_verified_result(session_factory, make_token):
    token = make_token(id="user-9", sub="learner@oopsly.app", role="USER")
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

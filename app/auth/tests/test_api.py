import json
import uuid

import jwt

from app.otp import MAX_ATTEMPTS
from tests.conftest import INTERNAL_KEY, TEST_EMAIL, bearer, login

BASE = "/api/auth"
PATCH_TYPE = {"Content-Type": "application/json-patch+json"}


def _patch(client, tokens, ops, content_type=PATCH_TYPE):
    return client.patch(
        f"{BASE}/v1/user-profiles/profile/updates",
        content=json.dumps(ops),
        headers={**bearer(tokens), **content_type},
    )


# --- health + jwks ---


def test_health_is_served_at_both_paths(client):
    for path in ("/actuator/health", f"{BASE}/actuator/health"):
        assert client.get(path).json() == {"status": "UP"}


def test_jwks_is_published_at_the_well_known_path(client):
    for path in ("/.well-known/pub.json", f"{BASE}/.well-known/pub.json"):
        res = client.get(path)
        assert res.status_code == 200
        assert res.headers["cache-control"] == "public, max-age=300"
        (jwk,) = res.json()["keys"]
        assert jwk["alg"] == "RS256" and jwk["use"] == "sig"


def test_issued_tokens_verify_against_the_published_jwks(client):
    tokens = login(client)
    jwks = client.get("/.well-known/pub.json").json()["keys"]
    header = jwt.get_unverified_header(tokens["access_token"])
    jwk = next(k for k in jwks if k["kid"] == header["kid"])
    claims = jwt.decode(
        tokens["access_token"], jwt.PyJWK(jwk).key, algorithms=["RS256"]
    )
    assert claims["sub"] == TEST_EMAIL
    assert claims["role"] == "USER" and claims["plan"] == "FREE"
    uuid.UUID(claims["id"])


# --- otp + login ---


def test_otp_is_mailed_for_regular_emails(client, outbox):
    res = client.post(f"{BASE}/v1/otp", params={"email": "new@oopsly.dev"})
    assert res.status_code == 200
    assert res.json()["message"] == "OTP sent successfully to new@oopsly.dev"
    ((to, code),) = outbox.sent
    assert to == "new@oopsly.dev" and len(code) == 6

    tokens = login_with(client, "new@oopsly.dev", code)
    assert tokens["type"] == "Bearer"


def login_with(client, email, code):
    res = client.post(f"{BASE}/v1/otp/validate", json={"email": email, "otp": code})
    assert res.status_code == 200, res.text
    return res.json()["data"]


def test_otp_for_test_emails_is_not_mailed(client, outbox):
    assert (
        client.post(f"{BASE}/v1/otp", params={"email": TEST_EMAIL}).status_code == 200
    )
    assert outbox.sent == []


def test_otp_rejects_bad_email(client):
    res = client.post(f"{BASE}/v1/otp", params={"email": "nope"})
    assert res.status_code == 400
    assert res.json()["message"] == "Invalid Email Format"
    assert res.json()["isSuccess"] is False


def test_failed_mail_delivery_does_not_fail_the_request(client, outbox):
    def boom(to, code):
        raise OSError("smtp down")

    outbox.send_otp = boom
    assert (
        client.post(f"{BASE}/v1/otp", params={"email": "x@oopsly.dev"}).status_code
        == 200
    )


def test_validate_otp_error_cases(client, outbox):
    bad_body = client.post(f"{BASE}/v1/otp/validate", json={"email": "x", "otp": "1"})
    assert (bad_body.status_code, bad_body.json()["message"]) == (
        400,
        "Invalid request body",
    )
    garbage = client.post(f"{BASE}/v1/otp/validate", content="not json")
    assert garbage.status_code == 400

    expired = client.post(
        f"{BASE}/v1/otp/validate", json={"email": "a@oopsly.dev", "otp": "123456"}
    )
    assert expired.status_code == 404

    client.post(f"{BASE}/v1/otp", params={"email": "a@oopsly.dev"})
    wrong = "000001" if outbox.sent[0][1] != "000001" else "000002"
    for _ in range(MAX_ATTEMPTS):
        res = client.post(
            f"{BASE}/v1/otp/validate", json={"email": "a@oopsly.dev", "otp": wrong}
        )
        assert res.status_code == 400
    locked = client.post(
        f"{BASE}/v1/otp/validate", json={"email": "a@oopsly.dev", "otp": wrong}
    )
    assert locked.status_code == 429


def test_login_creates_the_user_once_and_names_it_from_the_email(client):
    first = login(client)
    second = login(client)
    profile = client.get(f"{BASE}/v1/user-profiles", headers=bearer(second)).json()
    assert profile["data"]["name"] == "test"
    assert profile["data"]["email"] == TEST_EMAIL
    claims = [
        jwt.decode(t["access_token"], options={"verify_signature": False})
        for t in (first, second)
    ]
    assert claims[0]["id"] == claims[1]["id"]


# --- tokens ---


def test_refresh_flow(client):
    tokens = login(client)
    res = client.post(
        f"{BASE}/v1/users/refresh-token",
        json={"refresh_token": tokens["refresh_token"], "user_email": TEST_EMAIL},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["refresh_token"] == tokens["refresh_token"]
    assert (
        client.get(f"{BASE}/v1/users/validate", headers=bearer(data)).status_code == 200
    )


def test_refresh_rejects_bad_requests(client):
    tokens = login(client)

    def refresh(**body):
        return client.post(f"{BASE}/v1/users/refresh-token", json=body)

    assert refresh(user_email=TEST_EMAIL).status_code == 400
    assert refresh(refresh_token="x", user_email="bad").status_code == 400
    assert refresh(refresh_token="garbage", user_email=TEST_EMAIL).status_code == 401
    assert (
        refresh(
            refresh_token=tokens["refresh_token"], user_email="other@oopsly.dev"
        ).status_code
        == 401
    )
    assert (
        refresh(refresh_token=tokens["access_token"], user_email=TEST_EMAIL).status_code
        == 401
    )


def test_refresh_for_unknown_user_is_unauthorized(client):
    tokens = login(client)
    ghost = client.keys  # signs a syntactically valid token for an email with no user
    from datetime import timedelta

    from app.tokens import TokenService

    token = TokenService(ghost, timedelta(hours=1), timedelta(days=1)).refresh_token(
        "ghost@oopsly.dev"
    )
    res = client.post(
        f"{BASE}/v1/users/refresh-token",
        json={"refresh_token": token, "user_email": "ghost@oopsly.dev"},
    )
    assert res.status_code == 401
    assert "User not found" in res.json()["message"]
    assert tokens


def test_logout_revokes_the_refresh_token(client):
    tokens = login(client)
    assert (
        client.post(f"{BASE}/v1/users/logout", headers=bearer(tokens)).status_code
        == 200
    )
    res = client.post(
        f"{BASE}/v1/users/refresh-token",
        json={"refresh_token": tokens["refresh_token"], "user_email": TEST_EMAIL},
    )
    assert res.status_code == 401


def test_new_login_replaces_the_stored_refresh_token(client):
    first = login(client)
    login(client)
    res = client.post(
        f"{BASE}/v1/users/refresh-token",
        json={"refresh_token": first["refresh_token"], "user_email": TEST_EMAIL},
    )
    assert res.status_code == 401


def test_validate_returns_valid(client):
    res = client.get(f"{BASE}/v1/users/validate", headers=bearer(login(client)))
    assert res.json()["data"] == {"valid": True}


# --- authentication guard ---


def test_protected_routes_require_a_valid_bearer(client):
    missing = client.get(f"{BASE}/v1/user-profiles")
    assert missing.status_code == 401
    assert missing.json()["message"] == "You must be logged in to access this resource."
    invalid = client.get(
        f"{BASE}/v1/user-profiles", headers={"Authorization": "Bearer x"}
    )
    assert invalid.json()["message"] == "EXPIRED_OR_INVALID_JWT"
    refresh_as_access = client.get(
        f"{BASE}/v1/user-profiles",
        headers={"Authorization": f"Bearer {login(client)['refresh_token']}"},
    )
    assert refresh_as_access.status_code == 401


def test_token_of_a_deleted_user_is_rejected(client, session_factory):
    from app.models import User

    tokens = login(client)
    with session_factory() as db:
        db.query(User).update({"deleted": True})
        db.commit()
    assert (
        client.get(f"{BASE}/v1/users/validate", headers=bearer(tokens)).status_code
        == 401
    )


# --- profile ---


def test_update_profile_validates_and_saves(client):
    tokens = login(client)
    url = f"{BASE}/v1/user-profiles"
    ok = client.patch(
        url, json={"displayName": "Hao", "bio": "hi", "age": 30}, headers=bearer(tokens)
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["displayName"] == "Hao"
    for body in (
        {"displayName": " ", "bio": ""},
        {"displayName": "x" * 51, "bio": ""},
        {"displayName": "x", "bio": "b" * 256},
        {"displayName": "x", "bio": "", "age": 0},
        {"displayName": "x", "bio": "", "age": 121},
    ):
        assert client.patch(url, json=body, headers=bearer(tokens)).status_code == 400


def test_update_settings(client):
    tokens = login(client)
    url = f"{BASE}/v1/user-profiles/settings"
    body = {"theme": "dark", "language": "vi", "spaceConfig": {}, "studySchedule": {}}
    res = client.patch(url, json=body, headers=bearer(tokens))
    assert res.status_code == 200
    settings = res.json()["data"]["settings"]
    assert (settings["theme"], settings["language"]) == ("DARK", "vi")

    for broken in (
        {**body, "theme": " "},
        {**body, "language": ""},
        {**body, "spaceConfig": None},
        {**body, "studySchedule": None},
        {**body, "theme": "neon"},
        {**body, "language": "xx"},
    ):
        assert client.patch(url, json=broken, headers=bearer(tokens)).status_code == 400
    assert client.patch(url, json=[1], headers=bearer(tokens)).status_code == 400


def test_newcomer_flag(client):
    tokens = login(client)
    url = f"{BASE}/v1/user-profiles/settings/newcomer"
    assert (
        client.patch(url, headers=bearer(tokens)).status_code == 400
    )  # no settings yet
    profile = client.get(f"{BASE}/v1/user-profiles", headers=bearer(tokens)).json()
    assert profile["data"]["settings"]["isNewComer"] is True
    assert client.patch(url, headers=bearer(tokens)).status_code == 200
    profile = client.get(f"{BASE}/v1/user-profiles", headers=bearer(tokens)).json()
    assert profile["data"]["settings"]["isNewComer"] is False


def test_json_patch_updates_allowed_fields(client):
    tokens = login(client)
    res = _patch(
        client,
        tokens,
        [
            {"op": "replace", "path": "/displayName", "value": "Hao N"},
            {"op": "replace", "path": "/age", "value": 33},
            {"op": "replace", "path": "/pictureUrl", "value": "https://x/y.png"},
        ],
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert (data["displayName"], data["age"], data["pictureUrl"]) == (
        "Hao N",
        33,
        "https://x/y.png",
    )


def test_json_patch_rejections(client):
    tokens = login(client)
    replace = {"op": "replace", "value": "x"}
    assert (
        _patch(client, tokens, [], {"Content-Type": "application/json"}).status_code
        == 415
    )
    for ops in (
        [{**replace, "path": "/email"}],
        [{**replace, "path": "/role"}],
        [{"op": "move", "from": "/email", "path": "/name"}],
        [{**replace, "path": "nope"}],
        [{**replace, "path": 5}],
        [{"op": "test", "path": "/name", "value": "never"}],
        [{"op": "remove", "path": "/bio"}],
        [{**replace, "path": "/age"}],
        [{**replace, "path": "/displayName", "value": ""}],
        [{**replace, "path": "/name", "value": "n" * 256}],
        [{**replace, "path": "/pictureUrl", "value": "u" * 501}],
        {"op": "replace"},
        ["bogus"],
    ):
        assert _patch(client, tokens, ops).status_code == 400, ops
    garbage = client.patch(
        f"{BASE}/v1/user-profiles/profile/updates",
        content="{",
        headers={**bearer(tokens), **PATCH_TYPE},
    )
    assert garbage.status_code == 400


def test_json_patch_body_size_is_limited(client):
    tokens = login(client)
    big = [{"op": "replace", "path": "/bio", "value": "x" * (1 << 20)}]
    assert _patch(client, tokens, big).status_code == 400


# --- subscriptions + internal ---


def _internal(key=INTERNAL_KEY):
    return {"X-Internal-Key": key}


def _user_id(client, tokens):
    return jwt.decode(tokens["access_token"], options={"verify_signature": False})["id"]


def test_subscription_defaults_to_free(client):
    res = client.get(f"{BASE}/v1/subscriptions/me", headers=bearer(login(client)))
    assert res.json()["data"] == {"plan": "FREE", "status": "ACTIVE", "expiresAt": None}


def test_internal_routes_require_the_internal_key(client, monkeypatch):
    body = {"ids": []}
    url = f"{BASE}/internal/v1/users/lookup"
    assert client.post(url, json=body).status_code == 403
    assert client.post(url, json=body, headers=_internal("wrong")).status_code == 403
    assert client.post(url, json=body, headers=_internal()).status_code == 200
    monkeypatch.setattr("app.deps.settings.internal_api_key", "")
    assert client.post(url, json=body, headers=_internal("")).status_code == 403


def test_set_subscription_flows_into_new_tokens(client):
    tokens = login(client)
    uid = _user_id(client, tokens)
    url = f"{BASE}/internal/v1/subscriptions/{uid}"
    res = client.put(
        url,
        json={"plan": "PRO_PLUS", "expiresAt": "2999-01-01T00:00:00Z"},
        headers=_internal(),
    )
    assert res.status_code == 200
    assert res.json()["data"]["plan"] == "PRO_PLUS"
    mine = client.get(f"{BASE}/v1/subscriptions/me", headers=bearer(tokens)).json()
    assert mine["data"]["plan"] == "PRO_PLUS"

    refreshed = client.post(
        f"{BASE}/v1/users/refresh-token",
        json={"refresh_token": tokens["refresh_token"], "user_email": TEST_EMAIL},
    ).json()["data"]
    claims = jwt.decode(refreshed["access_token"], options={"verify_signature": False})
    assert claims["plan"] == "PRO_PLUS"

    again = client.put(url, json={"plan": "PRO_PLUS"}, headers=_internal())
    assert again.status_code == 200  # same plan keeps started_at


def test_expired_subscription_counts_as_free(client):
    tokens = login(client)
    url = f"{BASE}/internal/v1/subscriptions/{_user_id(client, tokens)}"
    client.put(
        url,
        json={"plan": "PRO", "expiresAt": "2000-01-01T00:00:00Z"},
        headers=_internal(),
    )
    mine = client.get(f"{BASE}/v1/subscriptions/me", headers=bearer(tokens)).json()[
        "data"
    ]
    assert (mine["plan"], mine["status"]) == ("FREE", "EXPIRED")
    new = login(client)
    claims = jwt.decode(new["access_token"], options={"verify_signature": False})
    assert claims["plan"] == "FREE"


def test_set_subscription_rejections(client):
    tokens = login(client)
    uid = _user_id(client, tokens)
    base = f"{BASE}/internal/v1/subscriptions"
    assert (
        client.put(
            f"{base}/nope", json={"plan": "PRO"}, headers=_internal()
        ).status_code
        == 400
    )
    assert (
        client.put(
            f"{base}/{uid}", json={"plan": "GOLD"}, headers=_internal()
        ).status_code
        == 400
    )
    missing = client.put(
        f"{base}/{uuid.uuid4()}", json={"plan": "PRO"}, headers=_internal()
    )
    assert missing.status_code == 404


def test_lookup_users(client):
    tokens = login(client)
    uid = _user_id(client, tokens)
    client.get(f"{BASE}/v1/user-profiles", headers=bearer(tokens))  # creates settings
    url = f"{BASE}/internal/v1/users/lookup"
    res = client.post(url, json={"ids": [uid, str(uuid.uuid4())]}, headers=_internal())
    assert res.json()["data"] == [
        {
            "id": uid,
            "name": "test",
            "displayName": "test",
            "pictureUrl": "",
            "dailyGoal": 20,
        }
    ]
    assert (
        client.post(url, json={"ids": ["bad"]}, headers=_internal()).status_code == 400
    )
    too_many = {"ids": [str(uuid.uuid4()) for _ in range(201)]}
    assert client.post(url, json=too_many, headers=_internal()).status_code == 400


def test_lookup_defaults_the_daily_goal_without_settings(client):
    uid = _user_id(client, login(client))
    url = f"{BASE}/internal/v1/users/lookup"
    (row,) = client.post(url, json={"ids": [uid]}, headers=_internal()).json()["data"]
    assert row["dailyGoal"] == 20


# --- envelope ---


def test_unknown_route_uses_the_envelope(client):
    res = client.get(f"{BASE}/v1/nothing")
    assert res.status_code == 404
    assert set(res.json()) == {
        "isSuccess",
        "timestamp",
        "message",
        "statusCode",
        "data",
    }


def test_unhandled_errors_become_a_generic_500(client, monkeypatch):
    def boom(self, email):
        raise RuntimeError("secret detail")

    monkeypatch.setattr("app.service.AuthService.send_otp", boom)
    quiet = client.__class__(client.app, raise_server_exceptions=False)
    res = quiet.post(f"{BASE}/v1/otp", params={"email": "a@b.co"})
    assert res.status_code == 500
    assert res.json()["message"] == "Internal server error"


def test_features_for_visitor_use_common_values(client):
    data = client.get(f"{BASE}/v1/features").json()["data"]
    assert data["plan"] is None
    assert data["features"]["quiz.play"] == {"enabled": True, "source": "common"}
    assert data["features"]["ai.hint"] == {"enabled": False, "source": "common"}
    assert data["features"]["ads"]["enabled"] is True


def test_subscription_overrides_common_features(client):
    tokens = login(client)
    free = client.get(f"{BASE}/v1/features", headers=bearer(tokens)).json()["data"]
    assert free["plan"] == "FREE"
    assert free["features"]["ai.hint"]["enabled"] is False

    user_id = jwt.decode(tokens["access_token"], options={"verify_signature": False})[
        "id"
    ]
    client.put(
        f"{BASE}/internal/v1/subscriptions/{user_id}",
        json={"plan": "PRO"},
        headers=_internal(),
    )
    pro = client.get(f"{BASE}/v1/features", headers=bearer(tokens)).json()["data"]
    assert pro["features"]["ai.hint"] == {"enabled": True, "source": "subscription"}
    assert pro["features"]["ads"] == {"enabled": False, "source": "subscription"}
    assert pro["features"]["analytics.advanced"]["enabled"] is False
    assert pro["features"]["quiz.play"]["source"] == "common"


def test_single_feature_and_errors(client):
    one = client.get(f"{BASE}/v1/features/quiz.play").json()["data"]
    assert one == {
        "key": "quiz.play",
        "enabled": True,
        "source": "common",
        "plan": None,
    }
    assert client.get(f"{BASE}/v1/features/nope").status_code == 404
    bad = client.get(f"{BASE}/v1/features", headers={"Authorization": "Bearer x"})
    assert bad.status_code == 401

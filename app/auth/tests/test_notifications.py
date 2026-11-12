import json

import jwt

from app import deps, mail
from app.config import settings
from tests.conftest import INTERNAL_KEY
from tests.test_api import BASE, TEST_EMAIL, login

INVITE = f"{BASE}/internal/v1/notifications/community-invite"
HEADERS = {"X-Internal-Key": INTERNAL_KEY}


def user_id(client, tokens):
    claims = jwt.decode(tokens["access_token"], options={"verify_signature": False})
    return claims["id"]


def test_welcome_is_sent_once_on_signup(client, outbox):
    login(client)
    login(client)
    assert outbox.welcomes == [(TEST_EMAIL, "test")]


def test_failed_welcome_does_not_break_signup(client, outbox):
    def boom(*a):
        raise RuntimeError("queue down")

    outbox.send_welcome = boom
    assert login(client)["type"] == "Bearer"


def test_community_invite_notifies_the_invited_user(client, outbox):
    uid = user_id(client, login(client))
    res = client.post(
        INVITE,
        json={"userId": uid, "communityName": "Math Club", "inviterName": "Bo"},
        headers=HEADERS,
    )
    assert res.status_code == 200
    assert outbox.invites == [(TEST_EMAIL, "test", "Math Club", "Bo")]


def test_community_invite_ignores_unknown_users(client, outbox):
    for uid in ("not-a-uuid", "00000000-0000-0000-0000-000000000000"):
        res = client.post(
            INVITE, json={"userId": uid, "communityName": "X"}, headers=HEADERS
        )
        assert res.status_code == 200
    assert outbox.invites == []


def test_community_invite_is_internal_only(client):
    res = client.post(INVITE, json={"userId": "x", "communityName": "X"})
    assert res.status_code in (401, 403)


class FakeLambda:
    def __init__(self):
        self.calls = []

    def invoke(self, FunctionName, InvocationType, Payload):
        self.calls.append((FunctionName, InvocationType, json.loads(Payload)))


def test_sender_invokes_the_template_asynchronously():
    fake = FakeLambda()
    sender = mail.Sender("quizi-noti-stg", client=fake)
    sender.send_otp("a@b.co", "123456", "Ann")
    sender.send_welcome("a@b.co", "Ann")
    sender.send_community_invite("a@b.co", "Ann", "Math Club", "Bo")
    sender.send_study_reminder("a@b.co", "Ann", "ICS")
    assert [c[2]["template"] for c in fake.calls] == [
        "otp",
        "welcome",
        "community_invite",
        "study_reminder",
    ]
    assert {c[:2] for c in fake.calls} == {("quizi-noti-stg", "Event")}
    assert fake.calls[0][2] == {
        "template": "otp",
        "to": "a@b.co",
        "data": {"code": "123456", "name": "Ann"},
    }
    assert fake.calls[2][2]["data"] == {
        "name": "Ann",
        "communityName": "Math Club",
        "inviterName": "Bo",
    }


def test_sender_builds_its_own_client(monkeypatch):
    import sys
    import types

    made = {}

    def client(name, region_name=None):
        made.update(name=name, region=region_name)
        return FakeLambda()

    monkeypatch.setitem(sys.modules, "boto3", types.SimpleNamespace(client=client))
    mail.Sender("quizi-noti-stg", "ap-southeast-1")
    assert made == {"name": "lambda", "region": "ap-southeast-1"}


def test_sender_follows_the_function_setting(monkeypatch):
    deps.get_sender.cache_clear()
    monkeypatch.setattr(settings, "app_env", "stg")
    monkeypatch.setattr(settings, "noti_function_name", "quizi-noti-stg")
    monkeypatch.setattr(
        mail, "Sender", lambda name, region, enabled: ("lambda", name, enabled)
    )
    assert deps.get_sender() == ("lambda", "quizi-noti-stg", True)
    deps.get_sender.cache_clear()


def test_develop_mode_sends_nothing(monkeypatch, caplog):
    deps.get_sender.cache_clear()
    monkeypatch.setattr(settings, "app_env", "Local")
    sender = deps.get_sender()  # builds no boto3 client
    with caplog.at_level("INFO"):
        sender.send_otp("hao@example.com", "123456", "Hao")
        sender.send_welcome("hao@example.com", "Hao")
    assert caplog.text.count("h***@example.com") == 2
    assert "hao@example.com" not in caplog.text
    # The skipped email's data is logged, so a local run can read its sign-in code.
    assert "123456" in caplog.text
    deps.get_sender.cache_clear()


def test_a_disabled_sender_never_touches_the_client():
    fake = FakeLambda()
    mail.Sender("quizi-noti-stg", client=fake, enabled=False).send_otp(
        "a@b.co", "123456", "Ann"
    )
    assert fake.calls == []

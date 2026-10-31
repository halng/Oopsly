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


class FakeSqs:
    def __init__(self):
        self.messages = []

    def send_message(self, QueueUrl, MessageBody):
        self.messages.append((QueueUrl, json.loads(MessageBody)))


def test_sqs_sender_publishes_one_event_per_email():
    sqs = FakeSqs()
    sender = mail.SqsSender("https://sqs.test/q", client=sqs)
    sender.send_otp("a@b.co", "123456")
    sender.send_welcome("a@b.co", "Ann")
    sender.send_community_invite("a@b.co", "Ann", "Math Club", "Bo")
    sender.send_study_reminder("a@b.co", "ICS")
    assert [m[1]["type"] for m in sqs.messages] == [
        "otp",
        "welcome",
        "community_invite",
        "study_reminder",
    ]
    assert {m[0] for m in sqs.messages} == {"https://sqs.test/q"}
    assert sqs.messages[0][1] == {
        "type": "otp",
        "to": "a@b.co",
        "data": {"code": "123456"},
    }
    assert sqs.messages[2][1]["data"] == {
        "name": "Ann",
        "communityName": "Math Club",
        "inviterName": "Bo",
    }


def test_sqs_sender_builds_its_own_client(monkeypatch):
    import sys
    import types

    made = {}

    def client(name, region_name=None):
        made.update(name=name, region=region_name)
        return FakeSqs()

    monkeypatch.setitem(sys.modules, "boto3", types.SimpleNamespace(client=client))
    mail.SqsSender("https://sqs.test/q", "ap-southeast-1")
    assert made == {"name": "sqs", "region": "ap-southeast-1"}


def test_noop_sender_only_logs(caplog):
    sender = mail.NoOpSender()
    with caplog.at_level("INFO"):
        sender.send_welcome("hao@example.com", "Hao")
        sender.send_community_invite("hao@example.com", "Hao", "Club", "Bo")
    assert caplog.text.count("h***@example.com") == 2


def test_sender_follows_the_queue_setting(monkeypatch):
    deps.get_sender.cache_clear()
    monkeypatch.setattr(settings, "noti_queue_url", "https://sqs.test/q")
    monkeypatch.setattr(mail, "SqsSender", lambda url, region: ("sqs", url))
    assert deps.get_sender() == ("sqs", "https://sqs.test/q")
    deps.get_sender.cache_clear()

import json

import pytest

from noti import events, handler, resend

CFG = resend.ResendConfig("re_key", "no-reply@quizi.test")


def payload(**over):
    base = {"template": "otp", "to": "ann@example.com", "data": {"code": "123456"}}
    base.update(over)
    return base


@pytest.fixture
def config(monkeypatch):
    monkeypatch.setattr(handler, "resend_config", lambda: CFG)


def test_sends_the_rendered_template(config):
    sent = []
    result = handler.handler(
        payload(),
        None,
        send=lambda cfg, to, msg, ics=None: sent.append((cfg, to, msg.subject, ics)),
    )
    assert result == {"status": "sent"}
    assert sent == [
        (CFG, "ann@example.com", "123456 is your Quizi verification code", None)
    ]


def test_study_reminder_attaches_the_ics(config):
    sent = []
    handler.handler(
        payload(template=events.STUDY_REMINDER, data={"ics": "ICS"}),
        None,
        send=lambda cfg, to, msg, ics=None: sent.append(ics),
    )
    assert sent == ["ICS"]


def test_delivery_failure_is_raised_so_lambda_retries(config):
    def down(cfg, to, msg, ics=None):
        raise resend.ResendError("down")

    with pytest.raises(resend.ResendError):
        handler.handler(payload(), None, send=down)


def test_malformed_requests_are_dropped_not_retried(config):
    result = handler.handler("garbage", None, send=lambda *a, **k: 1 / 0)
    assert result["status"] == "dropped"
    result = handler.handler(payload(template="nope"), None, send=lambda *a, **k: 1 / 0)
    assert result["status"] == "dropped"


def test_resend_config_reads_the_secret(monkeypatch):
    class Client:
        def get_secret_value(self, SecretId):
            assert SecretId == "arn:secret"
            return {
                "SecretString": json.dumps({"api_key": "re_1", "from_email": "a@b.c"})
            }

    import sys
    import types

    fake = types.SimpleNamespace(client=lambda name: Client())
    monkeypatch.setitem(sys.modules, "boto3", fake)
    monkeypatch.setenv("RESEND_SECRET_ARN", "arn:secret")
    handler.resend_config.cache_clear()
    assert handler.resend_config().api_key == "re_1"
    handler.resend_config.cache_clear()

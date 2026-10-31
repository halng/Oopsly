import json

from noti import events, handler, smtp

CFG = smtp.SmtpConfig("h", 587, "u", "p", "no-reply@oopsly.test")


def record(message_id, **over):
    body = {"type": "otp", "to": "ann@example.com", "data": {"code": "123456"}}
    body.update(over)
    return {"messageId": message_id, "body": json.dumps(body)}


def test_sends_every_message(monkeypatch):
    monkeypatch.setattr(handler, "smtp_config", lambda: CFG)
    sent = []
    result = handler.handler(
        {"Records": [record("1"), record("2", type="welcome", data={})]},
        None,
        send=lambda cfg, to, msg, ics=None: sent.append((to, msg.subject, ics)),
    )
    assert result == {"batchItemFailures": []}
    assert [s[0] for s in sent] == ["ann@example.com"] * 2


def test_study_reminder_attaches_the_ics(monkeypatch):
    monkeypatch.setattr(handler, "smtp_config", lambda: CFG)
    sent = []
    handler.handler(
        {"Records": [record("1", type=events.STUDY_REMINDER, data={"ics": "ICS"})]},
        None,
        send=lambda cfg, to, msg, ics=None: sent.append(ics),
    )
    assert sent == ["ICS"]


def test_only_the_failed_message_is_retried(monkeypatch):
    monkeypatch.setattr(handler, "smtp_config", lambda: CFG)

    def flaky(cfg, to, msg, ics=None):
        if to == "bad@example.com":
            raise OSError("smtp down")

    result = handler.handler(
        {"Records": [record("1"), record("2", to="bad@example.com")]},
        None,
        send=flaky,
    )
    assert result == {"batchItemFailures": [{"itemIdentifier": "2"}]}


def test_malformed_messages_are_dropped_not_retried(monkeypatch):
    monkeypatch.setattr(handler, "smtp_config", lambda: CFG)
    result = handler.handler(
        {"Records": [{"messageId": "1", "body": "garbage"}]},
        None,
        send=lambda *a, **k: 1 / 0,
    )
    assert result == {"batchItemFailures": []}


def test_smtp_config_reads_the_secret(monkeypatch):
    class Client:
        def get_secret_value(self, SecretId):
            assert SecretId == "arn:secret"
            return {"SecretString": json.dumps({"host": "h", "from_email": "a@b.c"})}

    import sys
    import types

    fake = types.SimpleNamespace(client=lambda name: Client())
    monkeypatch.setitem(sys.modules, "boto3", fake)
    monkeypatch.setenv("SMTP_SECRET_ARN", "arn:secret")
    handler.smtp_config.cache_clear()
    assert handler.smtp_config().host == "h"
    handler.smtp_config.cache_clear()

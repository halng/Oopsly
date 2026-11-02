import base64
import io
import json
import urllib.error

import pytest

from noti import resend
from noti.templates import Message

CFG = resend.ResendConfig("re_key", "Quizi <no-reply@quizi.tech>")
MSG = Message(subject="Hi", html="<p>Hi</p>", text="Hi")


def test_config_needs_key_and_sender():
    with pytest.raises(ValueError, match="api_key"):
        resend.ResendConfig.from_dict({"from_email": "a@b.c"})
    cfg = resend.ResendConfig.from_dict({"api_key": "k", "from_email": "a@b.c"})
    assert (cfg.api_key, cfg.from_email) == ("k", "a@b.c")


def test_build_has_both_bodies_and_no_attachment():
    payload = resend.build(CFG, "ann@example.com", MSG, None)
    assert payload == {
        "from": "Quizi <no-reply@quizi.tech>",
        "to": ["ann@example.com"],
        "subject": "Hi",
        "html": "<p>Hi</p>",
        "text": "Hi",
    }


def test_build_attaches_the_calendar_as_base64():
    payload = resend.build(CFG, "ann@example.com", MSG, "BEGIN:VCALENDAR")
    attachment = payload["attachments"][0]
    assert attachment["filename"] == "quizi-learning.ics"
    assert base64.b64decode(attachment["content"]) == b"BEGIN:VCALENDAR"


def test_send_posts_json_with_the_bearer_key(monkeypatch):
    seen = {}

    def urlopen(request, timeout):
        seen.update(
            url=request.full_url,
            auth=request.get_header("Authorization"),
            body=json.loads(request.data),
            timeout=timeout,
        )
        return io.BytesIO(b"{}")

    monkeypatch.setattr(resend.urllib.request, "urlopen", urlopen)
    resend.send(CFG, "ann@example.com", MSG)
    assert seen["url"] == resend.API_URL
    assert seen["auth"] == "Bearer re_key"
    assert seen["body"]["to"] == ["ann@example.com"]


def test_http_errors_become_resend_errors(monkeypatch):
    def urlopen(request, timeout):
        raise urllib.error.HTTPError(
            resend.API_URL, 422, "bad", {}, io.BytesIO(b'{"message":"invalid from"}')
        )

    monkeypatch.setattr(resend.urllib.request, "urlopen", urlopen)
    with pytest.raises(resend.ResendError, match="422.*invalid from"):
        resend.send(CFG, "ann@example.com", MSG)


def test_network_errors_become_resend_errors(monkeypatch):
    def urlopen(request, timeout):
        raise urllib.error.URLError("no route")

    monkeypatch.setattr(resend.urllib.request, "urlopen", urlopen)
    with pytest.raises(resend.ResendError, match="unreachable"):
        resend.send(CFG, "ann@example.com", MSG)

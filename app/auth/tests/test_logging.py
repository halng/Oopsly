import logging
import re

from app.logging_config import (
    OopslyFormatter,
    mask_headers,
    request_id,
    request_platform,
)
from tests.conftest import TEST_EMAIL, bearer, login

ANSI = re.compile(r"\x1b\[[0-9;]*m")


def _record(message="hello", level=logging.INFO, exc_info=None):
    return logging.LogRecord("app.service", level, __file__, 1, message, None, exc_info)


def test_line_matches_the_api_pattern():
    platform = request_platform.set("WEB")
    identifier = request_id.set("01ABC")
    try:
        line = ANSI.sub("", OopslyFormatter().format(_record("hi")))
    finally:
        request_platform.reset(platform)
        request_id.reset(identifier)
    # %d{ISO8601} %-5level [%t] [%X{XP}:%X{XID}] %logger - %msg
    assert re.fullmatch(
        r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d{3} INFO  \[MainThread\] "
        r"\[WEB:01ABC\] app\.service - hi",
        line,
    )


def test_exceptions_are_appended_to_the_line():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys

        record = _record("failed", logging.ERROR, sys.exc_info())
    text = ANSI.sub("", OopslyFormatter().format(record))
    assert "ERROR [" in text and text.rstrip().endswith("ValueError: boom")


def test_every_request_is_logged_with_status_duration_and_request_id(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.main"):
        client.get(
            "/actuator/health", headers={"X-Request-ID": "rid-1", "X-Platform": "WEB"}
        )
    (record,) = [r for r in caplog.records if r.name == "app.main"]
    assert re.fullmatch(
        r"Request: GET /actuator/health \| Status: 200 \| \d+ ms", record.getMessage()
    )


def test_a_request_id_is_generated_when_the_caller_sends_none(client):
    seen = []
    from app import main

    original = main.logger.info
    main.logger.info = lambda *a, **k: seen.append(request_id.get())
    try:
        client.get("/actuator/health")
    finally:
        main.logger.info = original
    assert re.fullmatch(r"[0-9a-f-]{36}", seen[0])


def test_failed_requests_log_the_error_once(client, monkeypatch, caplog):
    monkeypatch.setattr(
        "app.service.AuthService.send_otp",
        lambda self, email: (_ for _ in ()).throw(RuntimeError("secret detail")),
    )
    quiet = client.__class__(client.app, raise_server_exceptions=False)
    with caplog.at_level(logging.INFO, logger="app.main"):
        quiet.post("/api/auth/v1/otp", params={"email": "a@b.co"})
    errors = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert len(errors) == 1
    assert "Failed after" in errors[0].getMessage()
    assert errors[0].exc_info


def test_auth_events_are_logged_without_leaking_the_address(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.service"):
        tokens = login(client)
        client.post("/api/auth/v1/users/logout", headers=bearer(tokens))
    text = caplog.text
    assert "signed up" in text and "logged in" in text and "logged out" in text
    assert TEST_EMAIL not in text
    assert "t***@oopsly.dev" in text


def test_rejected_tokens_are_logged_as_warnings(client, caplog):
    with caplog.at_level(logging.WARNING, logger="app.deps"):
        client.get("/api/auth/v1/user-profiles", headers={"Authorization": "Bearer x"})
    assert "JWT authentication failed" in caplog.text


def test_mask_headers_never_exposes_credentials():
    masked = mask_headers(
        {
            "Authorization": "Bearer eyJhbGciOi.secret.token",
            "Cookie": "session=abc",
            "X-Access-Token": "tok",
            "X-Internal-Key": "super-secret-key",
            "X-Platform": "WEB",
        }
    )
    assert masked["authorization"] == "***"
    assert masked["cookie"] == "***"
    assert masked["x-access-token"] == "***"
    assert masked["x-platform"] == "WEB"
    assert "super-secret-key" not in masked["x-internal-key"]
    assert masked["x-internal-key"].startswith("<len=16 sha256=")


def test_rejected_requests_log_masked_headers(client, caplog):
    with caplog.at_level(logging.INFO, logger="app.main"):
        client.post(
            "/api/auth/internal/v1/users/lookup",
            json={"ids": []},
            headers={"X-Internal-Key": "wrong-key", "Authorization": "Bearer abc"},
        )
    (record,) = [r for r in caplog.records if r.name == "app.main"]
    text = record.getMessage()
    assert "Status: 403" in text and "Headers:" in text
    assert "wrong-key" not in text and "Bearer abc" not in text
    assert "'x-internal-key': '<len=9 sha256=" in text
    assert "'authorization': '***'" in text

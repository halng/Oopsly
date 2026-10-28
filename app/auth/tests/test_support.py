from datetime import timedelta

import pytest
from fastapi import HTTPException

from app import deps, domain, mail
from app.config import Settings
from app.envelope import ApiError
from app.kv import MemoryKV, RedisKV


def test_database_url_is_built_from_parts_and_escaped():
    built = Settings(db_username="u", db_password="p@ss:w/rd", db_host="h", db_name="d")
    assert (
        built.database_url_normalized()
        == "postgresql+psycopg://u:p%40ss%3Aw%2Frd@h:5432/d"
    )


def test_database_url_override_accepts_railway_and_plain_postgres():
    railway = Settings(database_url="postgres://u:p@h:5432/d")
    plain = Settings(database_url="postgresql://u:p@h:5432/d")
    driver = Settings(database_url="postgresql+psycopg://u:p@h:5432/d")
    expected = "postgresql+psycopg://u:p@h:5432/d"
    assert railway.database_url_normalized() == expected
    assert plain.database_url_normalized() == expected
    assert driver.database_url_normalized() == expected


def test_derived_settings():
    s = Settings(
        redis_host="r",
        redis_port=1,
        jwt_expiration_ms=1000,
        jwt_refresh_expiration_ms=2000,
        test_emails=" a@b.co, ,c@d.co",
        allowed_origins="http://x, http://y",
        jwt_key_rotation_days=7,
        jwt_key_publish_lead_hours=24,
    )
    assert s.redis_url() == "redis://r:1"
    assert s.access_ttl == timedelta(seconds=1)
    assert s.refresh_ttl == timedelta(seconds=2)
    assert s.test_email_list == ["a@b.co", "c@d.co"]
    assert s.origins == ["http://x", "http://y"]
    assert s.key_rotation_interval == timedelta(days=7)
    assert s.key_publish_lead == timedelta(days=1)
    assert s.key_retention == timedelta(seconds=2, hours=1)


def test_publish_lead_never_exceeds_half_the_rotation_interval():
    s = Settings(jwt_key_rotation_days=1, jwt_key_publish_lead_hours=48)
    assert s.key_publish_lead == timedelta(hours=12)


def test_domain_helpers():
    assert domain.parse_theme("dark") == "DARK" and domain.parse_theme("x") is None
    assert domain.parse_language("VI") == "VIETNAMESE"
    assert domain.parse_language("zz") is None
    assert domain.language_code("SPANISH") == "es"
    assert domain.language_code("KLINGON") == "en"
    assert domain.plan_at_least("PRO_PLUS", "PRO")
    assert not domain.plan_at_least("FREE", "PRO")
    assert not domain.plan_at_least("???", "PRO")
    assert not domain.plan_at_least("PRO", "???")
    assert domain.valid_plan("FREE") and not domain.valid_plan("GOLD")


def test_mail_helpers_and_template(caplog):
    assert mail.mask("hao@example.com") == "h***@example.com"
    assert mail.mask("a@b.co") == "***"
    html = mail.render_otp("<b>x</b>@example.com", "123<456")
    assert "123&lt;456" in html and "&lt;b&gt;x&lt;/b&gt;" in html
    assert "{{OTP_CODE}}" not in html and "{{USER_NAME}}" not in html
    with caplog.at_level("INFO"):
        mail.NoOpSender().send_otp("hao@example.com", "123456")
    assert "h***@example.com" in caplog.text
    assert "123456" not in caplog.text


def test_memory_kv_expiry_and_delete():
    now = [0.0]
    kv = MemoryKV(lambda: now[0])
    kv.set("a", "1", 10)
    kv.set("b", "2")
    assert kv.get("a") == "1"
    now[0] = 10
    assert kv.get("a") is None
    kv.delete("b", "missing")
    assert kv.get("b") is None


def test_redis_kv_delegates_to_the_client():
    class Client:
        def __init__(self):
            self.calls = []

        def get(self, key):
            return "v"

        def set(self, key, value, px=None):
            self.calls.append(("set", key, value, px))

        def delete(self, *keys):
            self.calls.append(("delete", keys))

    client = Client()
    kv = RedisKV(client)
    assert kv.get("k") == "v"
    kv.set("k", "v", 1.5)
    kv.set("k", "v")
    kv.delete("a", "b")
    kv.delete()
    assert client.calls == [
        ("set", "k", "v", 1500),
        ("set", "k", "v", None),
        ("delete", ("a", "b")),
    ]


def test_dependency_singletons_are_built_from_settings(monkeypatch):
    deps.get_kv.cache_clear()
    deps.get_sender.cache_clear()
    deps.get_key_store.cache_clear()
    assert isinstance(deps.get_kv(), RedisKV)  # lazy connection, nothing is contacted
    assert isinstance(deps.get_sender(), mail.NoOpSender)
    assert deps.get_key_store() is deps.get_key_store()
    assert callable(deps.get_run_async())
    for fn in (deps.get_kv, deps.get_sender, deps.get_key_store):
        fn.cache_clear()


def test_role_and_plan_guards():
    principal = deps.Principal("id", "a@b.co", "USER", "PRO")
    assert deps.require_role("USER", "ADMIN")(principal) is principal
    assert deps.require_plan("PRO")(principal) is principal
    with pytest.raises(ApiError) as role:
        deps.require_role("ADMIN")(principal)
    assert role.value.status == 403
    with pytest.raises(ApiError) as plan:
        deps.require_plan("PRO_PLUS")(principal)
    assert plan.value.status == 403


def test_get_db_closes_its_session(session_factory, monkeypatch):
    from app import db

    monkeypatch.setattr(db, "SessionLocal", session_factory)
    gen = db.get_db()
    session = next(gen)
    assert session.is_active
    with pytest.raises(StopIteration):
        next(gen)


def test_http_exception_without_string_detail_gets_a_generic_message(client):
    from app.main import app

    @app.get("/boom-detail")
    def boom():
        raise HTTPException(status_code=418, detail={"x": 1})

    res = client.get("/boom-detail")
    assert (res.status_code, res.json()["message"]) == (418, "Request failed")

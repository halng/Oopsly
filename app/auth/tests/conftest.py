from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as database
from app import deps
from app.config import settings
from app.db import Base, get_db
from app.keys import KeyStore
from app.kv import MemoryKV
from app.main import app

INTERNAL_KEY = "internal-secret"
TEST_EMAIL = "test@oopsly.dev"


class Clock:
    def __init__(self):
        self.value = datetime.now(UTC).replace(microsecond=0)

    def __call__(self) -> datetime:
        return self.value

    def advance(self, **delta) -> None:
        self.value += timedelta(**delta)


class OutboxSender:
    def __init__(self):
        self.sent: list[tuple[str, str]] = []
        self.reminders: list[tuple[str, str]] = []
        self.welcomes: list[tuple[str, str]] = []
        self.invites: list[tuple[str, str, str, str]] = []

    def send_otp(self, to: str, code: str) -> None:
        self.sent.append((to, code))

    def send_study_reminder(self, to: str, ics: str) -> None:
        self.reminders.append((to, ics))

    def send_welcome(self, to: str, name: str) -> None:
        self.welcomes.append((to, name))

    def send_community_invite(
        self, to: str, name: str, community_name: str, inviter_name: str
    ) -> None:
        self.invites.append((to, name, community_name, inviter_name))


def make_key_store(factory, clock=None, **overrides) -> KeyStore:
    options = {
        "rotation_interval": timedelta(days=7),
        "publish_lead": timedelta(days=1),
        "retention": timedelta(days=8),
        "key_size": 1024,
    }
    if clock is not None:
        options["now"] = clock
    return KeyStore(factory, **{**options, **overrides})


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def attach_auth_schema(connection, _):
        connection.execute("ATTACH DATABASE ':memory:' AS auth")

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture
def key_store(session_factory, clock):
    return make_key_store(session_factory, clock)


@pytest.fixture
def kv():
    return MemoryKV()


@pytest.fixture
def outbox():
    return OutboxSender()


@pytest.fixture
def client(session_factory, kv, outbox, monkeypatch):
    def override_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(database, "SessionLocal", session_factory)
    monkeypatch.setattr(settings, "internal_api_key", INTERNAL_KEY)
    monkeypatch.setattr(settings, "test_emails", TEST_EMAIL)
    monkeypatch.setattr(settings, "jwt_key_rotation_check_seconds", 3600)
    deps.get_key_store.cache_clear()
    keys = make_key_store(session_factory)
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[deps.get_key_store] = lambda: keys
    app.dependency_overrides[deps.get_kv] = lambda: kv
    app.dependency_overrides[deps.get_sender] = lambda: outbox
    app.dependency_overrides[deps.get_run_async] = lambda: lambda fn: fn()
    with TestClient(app) as test_client:
        test_client.keys = keys
        yield test_client
    app.dependency_overrides.clear()
    deps.get_key_store.cache_clear()


def login(client: TestClient, email: str = TEST_EMAIL, name: str = "") -> dict:
    res = client.post(
        "/api/auth/v1/otp/validate",
        json={"email": email, "otp": "000000", "name": name},
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]


def bearer(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import auth as auth_module
from app import db as database
from app.auth import current_user_id
from app.db import Base, get_db
from app.jwks import JwksCache
from app.main import app
from tests.tokens import jwk_for, new_key, sign


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    original_session = database.SessionLocal
    database.SessionLocal = factory
    yield factory
    database.SessionLocal = original_session
    app.dependency_overrides.clear()


@pytest.fixture
def client(session_factory):
    app.dependency_overrides[current_user_id] = lambda: "user-1"
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def rsa_key():
    return new_key()


@pytest.fixture(autouse=True)
def jwks_cache(monkeypatch, rsa_key):
    cache = JwksCache(
        "http://auth.test/.well-known/pub.json",
        fetch=lambda url, timeout: {"keys": [jwk_for(rsa_key)]},
    )
    monkeypatch.setattr(auth_module, "jwks", cache)
    return cache


@pytest.fixture
def make_token(rsa_key):
    def build(**claims):
        return sign(rsa_key, **claims)

    return build

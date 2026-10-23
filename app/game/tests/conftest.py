import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as database
from app.auth import current_user_id
from app.db import Base, get_db
from app.main import app


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

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    picture_url: Mapped[str | None] = mapped_column(String(500))
    display_name: Mapped[str | None] = mapped_column(String(50))
    bio: Mapped[str | None] = mapped_column(String(255))
    age: Mapped[int | None] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String(20), default="USER")


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    theme: Mapped[str] = mapped_column(String(50), default="SYSTEM")
    language: Mapped[str] = mapped_column(String(20), default="ENGLISH")
    daily_goal: Mapped[int] = mapped_column(Integer, default=20)
    target_retention_rate: Mapped[float] = mapped_column(Float, default=0.8)
    sound_effects_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    haptic_feedback_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_play_audio: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    is_new_comer: Mapped[bool] = mapped_column(Boolean, default=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("auth.users.id"), unique=True
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("auth.users.id"), primary_key=True
    )
    plan: Mapped[str] = mapped_column(String, default="FREE")
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SigningKey(Base):
    """An RS256 key pair. It signs from activate_at to retire_at and is published in
    the JWKS from creation until expires_at (when its last token has expired)."""

    __tablename__ = "signing_keys"

    kid: Mapped[str] = mapped_column(String(64), primary_key=True)
    private_pem: Mapped[str] = mapped_column(Text)
    public_jwk: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    activate_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), unique=True)
    retire_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

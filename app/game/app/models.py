import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(UTC)


class Garden(Base):
    __tablename__ = "game_gardens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    dew_drops: Mapped[int] = mapped_column(Integer, default=0)
    sunlight_orbs: Mapped[int] = mapped_column(Integer, default=0)
    growth_points: Mapped[int] = mapped_column(Integer, default=0)
    forest_coins: Mapped[int] = mapped_column(Integer, default=0)
    forest_level: Mapped[int] = mapped_column(Integer, default=1)
    total_focus_minutes: Mapped[int] = mapped_column(Integer, default=0)
    completed_sessions_count: Mapped[int] = mapped_column(Integer, default=0)
    total_xp_contributed: Mapped[int] = mapped_column(Integer, default=0)
    active_weather: Mapped[str] = mapped_column(String(20), default="sunny")
    seed_inventory: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    plots: Mapped[list["Plot"]] = relationship(
        back_populates="garden", cascade="all, delete-orphan"
    )
    trees: Mapped[list["Tree"]] = relationship(
        back_populates="garden", cascade="all, delete-orphan"
    )


class Plot(Base):
    __tablename__ = "game_plots"
    __table_args__ = (UniqueConstraint("garden_id", "plot_index", name="uk_game_plot"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    garden_id: Mapped[str] = mapped_column(
        ForeignKey("game_gardens.id"), nullable=False
    )
    plot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    unlock_cost: Mapped[int] = mapped_column(Integer, default=0)

    garden: Mapped[Garden] = relationship(back_populates="plots")


class Tree(Base):
    __tablename__ = "game_trees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    garden_id: Mapped[str] = mapped_column(
        ForeignKey("game_gardens.id"), nullable=False
    )
    plot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    species: Mapped[str] = mapped_column(String(40), nullable=False)
    stage: Mapped[str] = mapped_column(String(20), default="seed")
    water_level: Mapped[int] = mapped_column(Integer, default=50)
    growth_progress: Mapped[int] = mapped_column(Integer, default=0)
    total_waters: Mapped[int] = mapped_column(Integer, default=0)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)
    planted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_watered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    garden: Mapped[Garden] = relationship(back_populates="trees")

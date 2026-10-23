"""game garden tables

Revision ID: 001_game_tables
Revises:
Create Date: 2026-10-19
"""

from alembic import op
import sqlalchemy as sa

revision = "001_game_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "game_gardens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("dew_drops", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sunlight_orbs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("growth_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("forest_coins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("forest_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("total_focus_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_sessions_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_xp_contributed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active_weather", sa.String(length=20), nullable=False, server_default="sunny"),
        sa.Column("seed_inventory", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "game_plots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("garden_id", sa.String(length=36), sa.ForeignKey("game_gardens.id"), nullable=False),
        sa.Column("plot_index", sa.Integer(), nullable=False),
        sa.Column("is_unlocked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("unlock_cost", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("garden_id", "plot_index", name="uk_game_plot"),
    )
    op.create_table(
        "game_trees",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("garden_id", sa.String(length=36), sa.ForeignKey("game_gardens.id"), nullable=False),
        sa.Column("plot_index", sa.Integer(), nullable=False),
        sa.Column("species", sa.String(length=40), nullable=False),
        sa.Column("stage", sa.String(length=20), nullable=False),
        sa.Column("water_level", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("growth_progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_waters", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("nickname", sa.String(length=100), nullable=True),
        sa.Column("planted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_watered_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("game_trees")
    op.drop_table("game_plots")
    op.drop_table("game_gardens")

"""Per-device sessions: hashed refresh tokens

Revision ID: 003_login_tracker
Revises: 002_signing_keys
Create Date: 2026-11-05
"""

import sqlalchemy as sa

from alembic import op

revision = "003_login_tracker"
down_revision = "002_signing_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_tracker",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("auth.users.id"), nullable=False
        ),
        sa.Column("device", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("hashed_token", sa.String(length=64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        schema="auth",
    )
    op.create_index(
        "ix_login_tracker_user_id", "login_tracker", ["user_id"], schema="auth"
    )


def downgrade() -> None:
    op.drop_index("ix_login_tracker_user_id", table_name="login_tracker", schema="auth")
    op.drop_table("login_tracker", schema="auth")

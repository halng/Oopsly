"""RS256 signing keys published through the JWKS

Revision ID: 002_signing_keys
Revises: 001_auth_tables
Create Date: 2026-10-28
"""

import sqlalchemy as sa

from alembic import op

revision = "002_signing_keys"
down_revision = "001_auth_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "signing_keys",
        sa.Column("kid", sa.String(length=64), primary_key=True),
        sa.Column("private_pem", sa.Text(), nullable=False),
        sa.Column("public_jwk", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("activate_at", sa.DateTime(timezone=True), nullable=False, unique=True),
        sa.Column("retire_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        schema="auth",
    )
    op.create_index(
        "ix_signing_keys_expires_at", "signing_keys", ["expires_at"], schema="auth"
    )


def downgrade() -> None:
    op.drop_index("ix_signing_keys_expires_at", table_name="signing_keys", schema="auth")
    op.drop_table("signing_keys", schema="auth")

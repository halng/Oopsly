"""Stripe customer and subscription ids on subscriptions

Revision ID: 003_stripe_ids
Revises: 002_signing_keys
Create Date: 2026-11-03
"""

from alembic import op

revision = "003_stripe_ids"
down_revision = "002_signing_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE auth.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT"
    )
    op.execute(
        "ALTER TABLE auth.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_subscriptions_stripe_subscription_id "
        "ON auth.subscriptions (stripe_subscription_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS auth.ix_subscriptions_stripe_subscription_id")
    op.execute("ALTER TABLE auth.subscriptions DROP COLUMN IF EXISTS stripe_subscription_id")
    op.execute("ALTER TABLE auth.subscriptions DROP COLUMN IF EXISTS stripe_customer_id")

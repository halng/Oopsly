"""auth users, settings and subscriptions

Idempotent on purpose: the Go service already created these tables in existing
databases, so every statement tolerates them being there.

Revision ID: 001_auth_tables
Revises:
Create Date: 2026-10-28
"""

from alembic import op

revision = "001_auth_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            deleted BOOLEAN NOT NULL DEFAULT FALSE,
            name VARCHAR(255),
            email VARCHAR(255) NOT NULL UNIQUE,
            picture_url VARCHAR(500),
            display_name VARCHAR(50),
            bio VARCHAR(255),
            age INTEGER,
            role VARCHAR(20) NOT NULL DEFAULT 'USER'
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS auth.settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            deleted BOOLEAN NOT NULL DEFAULT FALSE,
            theme VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
            language VARCHAR(20) NOT NULL DEFAULT 'ENGLISH',
            daily_goal INTEGER NOT NULL DEFAULT 20,
            target_retention_rate DOUBLE PRECISION NOT NULL DEFAULT 0.8,
            sound_effects_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            haptic_feedback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            auto_play_audio BOOLEAN NOT NULL DEFAULT FALSE,
            allow_reminders BOOLEAN NOT NULL DEFAULT TRUE,
            is_new_comer BOOLEAN NOT NULL DEFAULT TRUE,
            user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS auth.subscriptions (
            user_id UUID PRIMARY KEY REFERENCES auth.users (id),
            plan TEXT NOT NULL DEFAULT 'FREE'
                CHECK (plan IN ('FREE', 'PRO', 'PRO_PLUS')),
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ
        )
    """)
    # One-time, idempotent copy of the data the monolith kept in public.users/settings.
    op.execute("""
        DO $$
        BEGIN
            IF to_regclass('public.users') IS NOT NULL THEN
                INSERT INTO auth.users (id, created_at, updated_at, deleted, name,
                                        email, picture_url, display_name, bio, age)
                SELECT id, COALESCE(created_at, now()), COALESCE(updated_at, now()),
                       COALESCE(deleted, FALSE), name, email, picture_url,
                       display_name, bio, age
                FROM public.users
                ON CONFLICT DO NOTHING;
            END IF;

            IF to_regclass('public.settings') IS NOT NULL THEN
                INSERT INTO auth.settings (id, created_at, updated_at, deleted, theme,
                    language, daily_goal, target_retention_rate, sound_effects_enabled,
                    haptic_feedback_enabled, auto_play_audio, allow_reminders,
                    is_new_comer, user_id)
                SELECT s.id, COALESCE(s.created_at, now()),
                       COALESCE(s.updated_at, now()), COALESCE(s.deleted, FALSE),
                       s.theme, s.language, COALESCE(s.daily_goal, 20),
                       COALESCE(s.target_retention_rate, 0.8),
                       COALESCE(s.sound_effects_enabled, TRUE),
                       COALESCE(s.haptic_feedback_enabled, TRUE),
                       COALESCE(s.auto_play_audio, FALSE),
                       COALESCE(s.allow_reminders, TRUE),
                       COALESCE(s.is_new_comer, TRUE), s.user_id
                FROM public.settings s
                WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = s.user_id)
                ON CONFLICT DO NOTHING;
            END IF;

            INSERT INTO auth.subscriptions (user_id)
            SELECT id FROM auth.users ON CONFLICT DO NOTHING;
        END $$
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auth.subscriptions")
    op.execute("DROP TABLE IF EXISTS auth.settings")
    op.execute("DROP TABLE IF EXISTS auth.users")

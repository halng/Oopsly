-- Per-user settings.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    theme VARCHAR(50) NOT NULL,
    language VARCHAR(20) NOT NULL,
    daily_goal INTEGER DEFAULT 20,
    target_retention_rate DOUBLE PRECISION DEFAULT 0.8,
    sound_effects_enabled BOOLEAN DEFAULT TRUE,
    haptic_feedback_enabled BOOLEAN DEFAULT TRUE,
    auto_play_audio BOOLEAN DEFAULT FALSE,
    allow_reminders BOOLEAN DEFAULT TRUE,
    is_new_comer BOOLEAN DEFAULT TRUE,
    daily_streak INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    league VARCHAR(50) DEFAULT 'BRONZE',
    retention_rate DOUBLE PRECISION DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_cards_studied INTEGER DEFAULT 0,
    user_id UUID NOT NULL UNIQUE REFERENCES users (id)
);

COMMIT;

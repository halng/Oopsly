-- Completed Learn / Match study sessions (XP source outside of FSRS reviews).
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES users (id),
    subject_id UUID NOT NULL REFERENCES subjects (id),
    mode VARCHAR(20) NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    correct_count INTEGER NOT NULL DEFAULT 0,
    mistakes INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    xp_gained INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_completed
    ON study_sessions (user_id, completed_at);

COMMIT;

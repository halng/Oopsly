-- Completed pomodoro sessions.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES users (id),
    subject_id UUID,
    focus_duration_minutes INTEGER NOT NULL,
    break_duration_minutes INTEGER DEFAULT 5,
    mode VARCHAR(20) NOT NULL,
    soundscape VARCHAR(30),
    xp_gained INTEGER DEFAULT 0,
    growth_points_gained INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ
);

COMMIT;

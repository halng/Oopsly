-- Players of a realtime quiz room.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS quiz_players (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    session_id UUID NOT NULL REFERENCES quiz_sessions (id),
    user_id UUID,
    display_name VARCHAR(255) NOT NULL,
    session_key VARCHAR(100) NOT NULL,
    score INTEGER DEFAULT 0,
    current_answer TEXT,
    joined_at TIMESTAMPTZ
);

COMMIT;

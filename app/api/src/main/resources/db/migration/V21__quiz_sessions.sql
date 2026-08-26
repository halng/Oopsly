-- Realtime quiz rooms.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    room_code VARCHAR(6) NOT NULL UNIQUE,
    host_id UUID NOT NULL REFERENCES users (id),
    subject_id UUID,
    subject_title VARCHAR(255),
    state VARCHAR(20) NOT NULL,
    current_question_index INTEGER DEFAULT -1,
    question_started_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

COMMIT;

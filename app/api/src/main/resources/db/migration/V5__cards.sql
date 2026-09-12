-- Flashcards with their FSRS scheduling state.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    front TEXT,
    back TEXT,
    hint varchar(255),
    difficulty_level VARCHAR(20),
    next_practice_time TIMESTAMPTZ,
    number_of_practice INTEGER DEFAULT 0,
    fsrs_stability DOUBLE PRECISION DEFAULT 0,
    fsrs_difficulty DOUBLE PRECISION DEFAULT 0,
    fsrs_interval_days INTEGER DEFAULT 0,
    fsrs_repetitions INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    subject_id UUID NOT NULL REFERENCES subjects (id)
    );

COMMIT;

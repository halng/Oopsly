-- Questions belonging to a test suite.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    text TEXT,
    type VARCHAR(50),
    metadata JSONB,
    test_suite_id UUID NOT NULL REFERENCES test_suites (id)
);

COMMIT;

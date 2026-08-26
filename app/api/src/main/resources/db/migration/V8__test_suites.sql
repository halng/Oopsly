-- Test suites.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS test_suites (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    title VARCHAR(255),
    is_active BOOLEAN,
    highest_score INTEGER,
    selection JSONB,
    shelf_id UUID NOT NULL REFERENCES shelves (id)
);

COMMIT;

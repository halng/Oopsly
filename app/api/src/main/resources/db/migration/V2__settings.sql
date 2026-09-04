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
    space_config JSONB NOT NULL,
    study_schedule JSONB,
    user_id UUID NOT NULL UNIQUE REFERENCES users (id)
);

COMMIT;

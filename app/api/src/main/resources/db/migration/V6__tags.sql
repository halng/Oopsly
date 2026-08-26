-- User owned card tags.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    name VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users (id)
);

COMMIT;

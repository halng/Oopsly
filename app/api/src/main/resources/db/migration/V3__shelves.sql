-- Library shelves.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS shelves (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    icon VARCHAR(100),
    name VARCHAR(255),
    description VARCHAR(1000),
    user_id UUID NOT NULL REFERENCES users (id)
);

COMMIT;

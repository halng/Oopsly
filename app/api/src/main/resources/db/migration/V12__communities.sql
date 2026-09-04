-- Community aggregate root.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    icon VARCHAR(100),
    color VARCHAR(30),
    banner_url VARCHAR(500),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    tags JSONB,
    owner_id UUID NOT NULL REFERENCES users (id)
);

COMMIT;

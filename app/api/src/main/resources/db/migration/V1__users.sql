-- Users aggregate root.
-- flyway:executeInTransaction=false

BEGIN;

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    picture_url VARCHAR(500),
    display_name VARCHAR(50),
    bio VARCHAR(255),
    age INTEGER
);

COMMIT;
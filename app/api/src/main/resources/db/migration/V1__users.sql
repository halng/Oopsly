-- Users aggregate root.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    hashed_password VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    picture_url VARCHAR(500),
    display_name VARCHAR(50),
    bio VARCHAR(255),
    age INTEGER,
    daily_streak INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ
);

COMMIT;

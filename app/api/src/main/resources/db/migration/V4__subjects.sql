-- Library subjects (self referencing tree).
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL DEFAULT '',
    color VARCHAR(20) DEFAULT '#FFFFFF',
    icon VARCHAR(100),
    description VARCHAR(1000),
    daily_limit INTEGER DEFAULT 20,
    new_cards_per_day INTEGER DEFAULT 5,
    interval DOUBLE PRECISION DEFAULT 1.0,
    is_public BOOLEAN DEFAULT FALSE,
    shelf_id UUID NOT NULL REFERENCES shelves (id)
);

COMMIT;

-- Community memberships.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    community_id UUID NOT NULL REFERENCES communities (id),
    user_id UUID NOT NULL REFERENCES users (id),
    role VARCHAR(20) NOT NULL,
    cards_studied_this_week INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ,
    CONSTRAINT uk_community_member UNIQUE (community_id, user_id)
);

COMMIT;

-- Community memberships.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS cms.community_members (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    community_id UUID NOT NULL REFERENCES cms.communities (id),
    user_id UUID NOT NULL REFERENCES cms.users (id),
    role VARCHAR(20) NOT NULL,
    cards_studied_this_week INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ,
    CONSTRAINT uk_community_member UNIQUE (community_id, user_id)
);

COMMIT;

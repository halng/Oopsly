-- Pending community join requests.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS community_join_requests (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    community_id UUID NOT NULL REFERENCES communities (id),
    user_id UUID NOT NULL REFERENCES users (id),
    message VARCHAR(500),
    status VARCHAR(20) NOT NULL,
    requested_at TIMESTAMPTZ
);

COMMIT;

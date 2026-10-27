-- Indexes of the community context.
-- flyway:executeInTransaction=false

BEGIN;

CREATE INDEX IF NOT EXISTS idx_community_members_user ON cms.community_members (user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_community_status
    ON cms.community_join_requests (community_id, status);

COMMIT;

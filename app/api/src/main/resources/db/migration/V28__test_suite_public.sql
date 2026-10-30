-- Test suites can be published so other users can find and clone them in Discover.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE cms.test_suites ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_test_suites_public
    ON cms.test_suites (created_at)
    WHERE is_public = TRUE AND deleted = FALSE;

COMMIT;

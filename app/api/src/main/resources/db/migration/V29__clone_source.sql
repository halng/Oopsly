-- A clone remembers what it was copied from, so Discover can hide what a user already has.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE cms.subjects ADD COLUMN IF NOT EXISTS cloned_from_id UUID;
ALTER TABLE cms.test_suites ADD COLUMN IF NOT EXISTS cloned_from_id UUID;

CREATE INDEX IF NOT EXISTS idx_subjects_cloned_from ON cms.subjects (cloned_from_id)
    WHERE cloned_from_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_suites_cloned_from ON cms.test_suites (cloned_from_id)
    WHERE cloned_from_id IS NOT NULL;

COMMIT;

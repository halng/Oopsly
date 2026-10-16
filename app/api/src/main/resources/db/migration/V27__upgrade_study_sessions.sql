-- Add server start tracking to sessions created by V26 and allow pending sessions.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

UPDATE study_sessions
SET started_at = COALESCE(created_at, now())
WHERE started_at IS NULL;

ALTER TABLE study_sessions ALTER COLUMN started_at SET NOT NULL;
ALTER TABLE study_sessions ALTER COLUMN completed_at DROP NOT NULL;

COMMIT;

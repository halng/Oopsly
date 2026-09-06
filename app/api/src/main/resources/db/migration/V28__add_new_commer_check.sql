-- Appearance fields used by the library UI.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS is_new_comer BOOLEAN DEFAULT TRUE;

COMMIT;

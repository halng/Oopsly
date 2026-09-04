-- Appearance fields used by the library UI.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon VARCHAR(100);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS color VARCHAR(30);
ALTER TABLE shelves ADD COLUMN IF NOT EXISTS color VARCHAR(30);

COMMIT;

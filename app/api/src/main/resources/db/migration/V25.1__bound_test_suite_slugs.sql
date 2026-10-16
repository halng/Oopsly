-- Bound slugs prepared by V24.1 and restore the entity's 255-character column size.
-- flyway:executeInTransaction=false

BEGIN;

UPDATE test_suites
SET slug = LEFT(slug, 218) || '-' || id::text
WHERE CHAR_LENGTH(slug) > 255;

ALTER TABLE test_suites ALTER COLUMN slug TYPE VARCHAR(255);

COMMIT;

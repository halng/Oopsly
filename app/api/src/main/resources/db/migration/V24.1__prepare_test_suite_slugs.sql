-- Prepare bounded unique slugs before V25 so duplicate long titles fit safely.
-- If V25 previously failed, repair its failed Flyway history entry so this migration runs first.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE test_suites ALTER COLUMN slug TYPE TEXT;

WITH base AS (
    SELECT id,
           shelf_id,
           created_at,
           COALESCE(
               NULLIF(
                   TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(title, '')), '[^a-z0-9]+', '-', 'g')),
                   ''),
               'test') AS base_slug
    FROM test_suites
    WHERE slug IS NULL OR slug = ''
),
ranked AS (
    SELECT id,
           base_slug,
           ROW_NUMBER() OVER (PARTITION BY shelf_id, base_slug ORDER BY created_at, id) AS rn
    FROM base
)
UPDATE test_suites t
SET slug = CASE
               WHEN r.rn = 1 THEN r.base_slug
               ELSE LEFT(r.base_slug, 218) || '-' || t.id::text
           END
FROM ranked r
WHERE t.id = r.id;

COMMIT;

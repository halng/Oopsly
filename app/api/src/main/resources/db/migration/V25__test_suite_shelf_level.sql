-- Test suites live at shelf level: slug for URLs, description and an optional time limit.
-- Question types are renamed: the old single-answer MULTIPLE_CHOICE becomes SINGLE_CHOICE,
-- and MULTIPLE_RESPONSE becomes MULTIPLE_CHOICE (several correct answers).
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;

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
               ELSE LEFT(r.base_slug, 246) || '-' || LEFT(t.id::text, 8)
           END
FROM ranked r
WHERE t.id = r.id;

-- Order matters: free the MULTIPLE_CHOICE name before reusing it.
UPDATE questions SET type = 'SINGLE_CHOICE' WHERE type = 'MULTIPLE_CHOICE';
UPDATE questions SET type = 'MULTIPLE_CHOICE' WHERE type = 'MULTIPLE_RESPONSE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_test_suites_shelf_slug
    ON test_suites (shelf_id, slug)
    WHERE deleted = FALSE;

COMMIT;

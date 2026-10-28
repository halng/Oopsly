-- User ownership moved to the auth service: this API keeps only plain user ids.
-- Learning progress (xp, streak, league) now lives in user_progress.
-- public.users and public.settings are intentionally left in place: the auth service copies them
-- into its own schema on first start, and a later migration will drop them.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS cms.user_progress (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL UNIQUE,
    total_xp INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    league VARCHAR(50) DEFAULT 'BRONZE',
    retention_rate DOUBLE PRECISION DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_cards_studied INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_progress_total_xp ON cms.user_progress (total_xp DESC);

INSERT INTO cms.user_progress (
    id, created_at, updated_at, deleted, user_id, total_xp, daily_streak,
    last_reviewed_at, league, retention_rate, total_reviews, total_cards_studied
)
SELECT
    s.id, s.created_at, s.updated_at, COALESCE(s.deleted, FALSE), s.user_id, s.total_xp,
    s.daily_streak, s.last_reviewed_at, s.league, s.retention_rate, s.total_reviews,
    s.total_cards_studied
FROM cms.settings s
ON CONFLICT (user_id) DO NOTHING;

-- Foreign keys were declared inline (unnamed), so find them through the catalog.
DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT conrelid::regclass AS table_name, conname
        FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'cms.users'::regclass
          AND conrelid <> 'cms.settings'::regclass
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.conname);
    END LOOP;
END $$;

COMMIT;

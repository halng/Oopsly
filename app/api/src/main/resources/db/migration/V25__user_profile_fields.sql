-- Gamification counters exposed on the user profile.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS retention_rate DOUBLE PRECISION DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cards_studied INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS league VARCHAR(20) DEFAULT 'BRONZE';

COMMIT;

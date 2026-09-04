-- Study goal and feedback preferences.
-- flyway:executeInTransaction=false

BEGIN;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 20;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS target_retention_rate DOUBLE PRECISION DEFAULT 0.9;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sound_effects_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS haptic_feedback_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_play_audio BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS allow_reminders BOOLEAN DEFAULT TRUE;

COMMIT;

-- Indexes of the garden & pomodoro context.
-- flyway:executeInTransaction=false

BEGIN;

CREATE INDEX IF NOT EXISTS idx_planted_trees_garden ON garden_planted_trees (garden_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_user ON pomodoro_sessions (user_id);

COMMIT;

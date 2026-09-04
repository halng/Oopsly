-- Indexes of the quiz context.
-- flyway:executeInTransaction=false

BEGIN;

CREATE INDEX IF NOT EXISTS idx_quiz_players_session ON quiz_players (session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_players_session_key ON quiz_players (session_key);

COMMIT;

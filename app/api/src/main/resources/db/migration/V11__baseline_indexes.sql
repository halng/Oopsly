-- Indexes supporting the library and review queries.
-- flyway:executeInTransaction=false

BEGIN;

CREATE INDEX IF NOT EXISTS idx_subjects_shelf ON subjects (shelf_id);
CREATE INDEX IF NOT EXISTS idx_cards_subject ON cards (subject_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_practice ON cards (next_practice_time);
CREATE INDEX IF NOT EXISTS idx_shelves_user ON shelves (user_id);

COMMIT;

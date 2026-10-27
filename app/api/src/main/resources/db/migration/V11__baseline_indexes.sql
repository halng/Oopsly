-- Indexes supporting the library and review queries.
-- flyway:executeInTransaction=false

BEGIN;

CREATE INDEX IF NOT EXISTS idx_subjects_shelf ON cms.subjects (shelf_id);
CREATE INDEX IF NOT EXISTS idx_cards_subject ON cms.cards (subject_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_practice ON cms.cards (next_practice_time);
CREATE INDEX IF NOT EXISTS idx_shelves_user ON cms.shelves (user_id);

COMMIT;

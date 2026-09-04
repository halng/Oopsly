-- Card <-> tag association.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS card_tags (
    card_id UUID NOT NULL REFERENCES cards (id),
    tag_id UUID NOT NULL REFERENCES tags (id),
    PRIMARY KEY (card_id, tag_id)
);

COMMIT;

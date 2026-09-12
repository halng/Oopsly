-- Subject <-> tag association.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS subjects_tags (
    subject_id UUID NOT NULL REFERENCES subjects (id),
    tag_id UUID NOT NULL REFERENCES tags (id),
    PRIMARY KEY (subject_id, tag_id)
);

COMMIT;

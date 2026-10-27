-- Subject <-> tag association.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS cms.subjects_tags (
    subject_id UUID NOT NULL REFERENCES cms.subjects (id),
    tag_id UUID NOT NULL REFERENCES cms.tags (id),
    PRIMARY KEY (subject_id, tag_id)
);

COMMIT;

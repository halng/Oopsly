-- Test suite <-> subject association.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS cms.test_suite_subjects (
    test_suite_id UUID NOT NULL REFERENCES cms.test_suites (id),
    subject_id UUID NOT NULL REFERENCES cms.subjects (id),
    PRIMARY KEY (test_suite_id, subject_id)
);

COMMIT;

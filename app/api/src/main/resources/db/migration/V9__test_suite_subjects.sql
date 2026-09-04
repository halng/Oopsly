-- Test suite <-> subject association.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS test_suite_subjects (
    test_suite_id UUID NOT NULL REFERENCES test_suites (id),
    subject_id UUID NOT NULL REFERENCES subjects (id),
    PRIMARY KEY (test_suite_id, subject_id)
);

COMMIT;

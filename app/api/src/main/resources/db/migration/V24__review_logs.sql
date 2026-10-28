-- Review log feeding the statistics context.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS cms.review_logs (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES cms.users (id),
    card_id UUID NOT NULL REFERENCES cms.cards (id),
    subject_id UUID REFERENCES cms.subjects (id),
    grade INTEGER NOT NULL,
    xp_gained INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 0,
    stability DOUBLE PRECISION DEFAULT 0,
    difficulty DOUBLE PRECISION DEFAULT 0,
    reviewed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_date ON cms.review_logs (user_id, reviewed_at);

COMMIT;

-- Garden aggregate root, one per user.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS garden_states (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL UNIQUE REFERENCES users (id),
    dew_drops INTEGER DEFAULT 0,
    sunlight_orbs INTEGER DEFAULT 0,
    growth_points INTEGER DEFAULT 0,
    forest_coins INTEGER DEFAULT 0,
    forest_level INTEGER DEFAULT 1,
    total_focus_minutes INTEGER DEFAULT 0,
    completed_sessions_count INTEGER DEFAULT 0,
    total_xp_contributed INTEGER DEFAULT 0,
    active_weather VARCHAR(20),
    seed_inventory JSONB
);

COMMIT;

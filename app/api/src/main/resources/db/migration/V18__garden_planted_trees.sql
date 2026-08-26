-- Trees planted in a garden.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS garden_planted_trees (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    garden_id UUID NOT NULL REFERENCES garden_states (id),
    plot_index INTEGER NOT NULL,
    species VARCHAR(50) NOT NULL,
    stage VARCHAR(20) NOT NULL,
    water_level INTEGER DEFAULT 50,
    growth_progress INTEGER DEFAULT 0,
    total_waters INTEGER DEFAULT 0,
    nickname VARCHAR(100),
    planted_at TIMESTAMPTZ,
    last_watered_at TIMESTAMPTZ
);

COMMIT;

-- Land plots of a garden.
-- flyway:executeInTransaction=false

BEGIN;

CREATE TABLE IF NOT EXISTS garden_land_plots (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    garden_id UUID NOT NULL REFERENCES garden_states (id),
    plot_index INTEGER NOT NULL,
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlock_cost INTEGER DEFAULT 0,
    CONSTRAINT uk_garden_plot_index UNIQUE (garden_id, plot_index)
);

COMMIT;

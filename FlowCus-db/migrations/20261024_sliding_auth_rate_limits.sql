-- Shared sliding-window login limiter. Existing fixed-window bucket rows are
-- intentionally left in place during rolling deployments; the new API ignores them.
BEGIN;

CREATE TABLE IF NOT EXISTS auth_rate_limit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identity_key VARCHAR(70) NOT NULL,
    occurred_on TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_events_identity_time
    ON auth_rate_limit_events (identity_key, occurred_on);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_events_time
    ON auth_rate_limit_events (occurred_on);

COMMIT;

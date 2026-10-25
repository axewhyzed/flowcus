-- =========================
-- userlist: app users
-- =========================

CREATE TABLE userlist (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- store bcrypt/argon2 output here
    name VARCHAR(100), -- display name for greetings
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_on TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0, -- number of failed login attempts
    lockout_until TIMESTAMPTZ NULL, -- account lockout until time
    lockout_count INTEGER NOT NULL DEFAULT 0, -- progressive lockout level (1=5m, 2=15m, 3+=60m)
    token_version INTEGER NOT NULL DEFAULT 0,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE, -- admin status indicator
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE -- soft delete flag
);

-- Sliding-window login admissions are shared across API instances.
CREATE TABLE auth_rate_limit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identity_key VARCHAR(70) NOT NULL,
    occurred_on TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_auth_rate_limit_events_identity_time
    ON auth_rate_limit_events (identity_key, occurred_on);
CREATE INDEX idx_auth_rate_limit_events_time
    ON auth_rate_limit_events (occurred_on);

-- Existing indexes (automatically created by PostgreSQL)
-- userlist_pkey ON id (PRIMARY KEY)
-- userlist_username_key ON username (UNIQUE)

-- No additional indexes needed for this table
-- Username lookup is already optimal via unique index

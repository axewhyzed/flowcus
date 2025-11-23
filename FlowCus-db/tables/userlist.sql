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
    is_admin BOOLEAN NOT NULL DEFAULT FALSE -- admin status indicator
);

-- Existing indexes (automatically created by PostgreSQL)
-- userlist_pkey ON id (PRIMARY KEY)
-- userlist_username_key ON username (UNIQUE)

-- No additional indexes needed for this table
-- Username lookup is already optimal via unique index
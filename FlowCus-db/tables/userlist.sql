-- =========================
-- userlist: app users
-- =========================
CREATE TABLE userlist (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- store bcrypt/argon2 output here
  name VARCHAR(100),                    -- display name for greetings
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_on TIMESTAMPTZ
);
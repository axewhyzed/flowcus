-- =========================
-- refresh_tokens: JWT refresh token management
-- Clean schema (Option A - custom implementation)
-- =========================

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES userlist(id) ON DELETE CASCADE,
    token VARCHAR(256) NOT NULL,
    expires_on TIMESTAMPTZ NOT NULL,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_on TIMESTAMPTZ NULL
);

-- Indexes for performance
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token) 
    WHERE revoked_on IS NULL;

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) 
    WHERE revoked_on IS NULL;

-- Verification query (run after creation):
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'refresh_tokens' 
-- ORDER BY indexname;
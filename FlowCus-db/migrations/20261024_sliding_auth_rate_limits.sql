-- Obsolete database rate limit tables dropped.
-- Rate limiting is handled in-memory in the application tier.
BEGIN;

DROP TABLE IF EXISTS auth_rate_limit_events;
DROP TABLE IF EXISTS auth_rate_limit_buckets;

COMMIT;

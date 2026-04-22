-- Trigger function to enforce max 5 subtypes per user
-- NOTE: This trigger has a potential TOCTOU (Time-of-check-time-of-use) race condition.
-- Under concurrent inserts, both can pass the COUNT check before either is committed,
-- allowing >5 subtypes to be created. Mitigations:
-- 1. Run application inserts within SERIALIZABLE transactions
-- 2. Use SELECT ... FOR UPDATE to obtain row-level locks before counting
-- 3. Use PostgreSQL advisory locks: SELECT pg_advisory_lock(user_id)
-- Currently, DEFAULT isolation level (READ COMMITTED) is vulnerable to this race.
CREATE OR REPLACE FUNCTION enforce_subtype_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Count non-deleted subtypes for this user (exclude this row when updating)
  IF TG_OP = 'INSERT' THEN
    IF (SELECT COUNT(*) FROM task_subtypes WHERE user_id = NEW.user_id AND is_deleted = FALSE) >= 5 THEN
      RAISE EXCEPTION 'User % already has the maximum of 5 subtypes', NEW.user_id;
    END IF;
  ELSE -- UPDATE
    IF (SELECT COUNT(*) FROM task_subtypes WHERE user_id = NEW.user_id AND is_deleted = FALSE AND id != NEW.id) >= 5 THEN
      RAISE EXCEPTION 'User % already has the maximum of 5 subtypes', NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
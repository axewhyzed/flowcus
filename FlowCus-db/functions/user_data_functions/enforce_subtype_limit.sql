-- Trigger function to enforce max 5 subtypes per user
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
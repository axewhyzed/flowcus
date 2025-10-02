-- Trigger function to enforce max 5 non-deleted timetables per user
CREATE OR REPLACE FUNCTION enforce_timetable_limit()
RETURNS TRIGGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  -- For INSERT: check how many non-deleted timetables this user already has
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO cnt FROM timetables WHERE user_id = NEW.user_id AND is_deleted = FALSE;
    IF cnt >= 5 THEN
      RAISE EXCEPTION 'User % already has the maximum of 5 active (non-deleted) timetables', NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  -- For UPDATE: consider the NEW state (if NEW.is_deleted = FALSE, ensure count excluding this row <= 4)
  IF TG_OP = 'UPDATE' THEN
    -- If the row remains or becomes non-deleted, ensure total non-deleted count excluding this row is < 5
    IF NEW.is_deleted = FALSE THEN
      SELECT COUNT(*) INTO cnt FROM timetables WHERE user_id = NEW.user_id AND is_deleted = FALSE AND id != NEW.id;
      IF cnt >= 5 THEN
        RAISE EXCEPTION 'User % already has the maximum of 5 active (non-deleted) timetables', NEW.user_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
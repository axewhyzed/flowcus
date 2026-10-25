-- Database-level backstop for time-slot concurrency, ownership, and subtype/category consistency.
-- Apply this function before tables/timetable_items.sql, which installs the trigger.
CREATE OR REPLACE FUNCTION enforce_timetable_item_integrity()
RETURNS TRIGGER AS $$
DECLARE
    timetable_user_id INTEGER;
    subtype_record RECORD;
    has_overlap BOOLEAN;
BEGIN
    IF NEW.specific_date IS NOT NULL AND EXTRACT(DOW FROM NEW.specific_date)::INTEGER <> NEW.day_of_week THEN
        RAISE EXCEPTION 'Specific date must match the selected day of week'
            USING ERRCODE = '23514';
    END IF;

    PERFORM 1 FROM task_category
    WHERE id = NEW.task_category_id AND is_deleted = FALSE
    FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task category does not exist or is deleted'
            USING ERRCODE = '23503';
    END IF;

    -- Serialize changes for one timetable/day so concurrent inserts cannot both pass the overlap check.
    PERFORM pg_advisory_xact_lock(NEW.timetable_id, NEW.day_of_week);

    SELECT user_id INTO timetable_user_id
    FROM timetables
    WHERE id = NEW.timetable_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Timetable does not exist or is deleted'
            USING ERRCODE = '23503';
    END IF;

    IF NEW.task_subtype_id IS NOT NULL THEN
        SELECT user_id, category_id INTO subtype_record
        FROM task_subtypes
        WHERE id = NEW.task_subtype_id AND is_deleted = FALSE;
        IF NOT FOUND OR subtype_record.user_id <> timetable_user_id OR subtype_record.category_id <> NEW.task_category_id THEN
            RAISE EXCEPTION 'Task subtype does not belong to this timetable user and category'
                USING ERRCODE = '23503';
        END IF;
    END IF;

    IF NEW.is_deleted = FALSE THEN
        SELECT EXISTS (
            SELECT 1
            FROM timetable_items existing
            WHERE existing.timetable_id = NEW.timetable_id
              AND existing.day_of_week = NEW.day_of_week
              AND existing.is_deleted = FALSE
              AND existing.id IS DISTINCT FROM NEW.id
              AND (NEW.specific_date IS NULL OR existing.specific_date IS NULL OR existing.specific_date = NEW.specific_date)
              AND existing.start_time < NEW.end_time
              AND existing.end_time > NEW.start_time
        ) INTO has_overlap;

        IF has_overlap THEN
            RAISE EXCEPTION 'Time slot overlaps with an existing event on this day'
                USING ERRCODE = '23P01';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

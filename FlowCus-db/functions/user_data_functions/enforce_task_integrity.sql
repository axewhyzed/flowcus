-- Protect task references against soft-delete races and direct database writes.
-- Apply before tables/tasks.sql, which installs the trigger.
CREATE OR REPLACE FUNCTION enforce_task_integrity()
RETURNS TRIGGER AS $$
DECLARE
    active_category_id INTEGER;
    subtype_record RECORD;
    references_changed BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_completed THEN
            NEW.completed_on := now();
        ELSE
            NEW.completed_on := NULL;
        END IF;
    ELSIF NEW.is_completed = FALSE THEN
        NEW.completed_on := NULL;
    ELSIF OLD.is_completed = FALSE AND NEW.is_completed = TRUE THEN
        NEW.completed_on := now();
    ELSE
        NEW.completed_on := OLD.completed_on;
    END IF;

    IF TG_OP = 'INSERT' THEN
        references_changed := TRUE;
    ELSE
        references_changed := NEW.task_category_id IS DISTINCT FROM OLD.task_category_id
            OR NEW.task_subtype_id IS DISTINCT FROM OLD.task_subtype_id
            OR NEW.created_by IS DISTINCT FROM OLD.created_by;
    END IF;

    IF references_changed THEN
        SELECT c.id INTO active_category_id
        FROM task_category c
        WHERE c.id = NEW.task_category_id AND c.is_deleted = FALSE
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Task category does not exist or is deleted'
                USING ERRCODE = '23503';
        END IF;

        IF NEW.task_subtype_id IS NOT NULL THEN
            SELECT s.user_id, s.category_id INTO subtype_record
            FROM task_subtypes s
            WHERE s.id = NEW.task_subtype_id AND s.is_deleted = FALSE
            FOR SHARE;
            IF NOT FOUND OR subtype_record.user_id <> NEW.created_by OR subtype_record.category_id <> NEW.task_category_id THEN
                RAISE EXCEPTION 'Task subtype does not belong to this user and category'
                    USING ERRCODE = '23503';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

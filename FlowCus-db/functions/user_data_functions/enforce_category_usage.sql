-- Prevent a category from being soft-deleted while active records still use it.
-- Apply before tables/task_category.sql, which installs the trigger.
CREATE OR REPLACE FUNCTION prevent_category_soft_delete_with_references()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE AND (
        EXISTS (SELECT 1 FROM tasks WHERE task_category_id = OLD.id AND is_deleted = FALSE)
        OR EXISTS (SELECT 1 FROM task_subtypes WHERE category_id = OLD.id AND is_deleted = FALSE)
        OR EXISTS (SELECT 1 FROM timetable_items WHERE task_category_id = OLD.id AND is_deleted = FALSE)
    ) THEN
        RAISE EXCEPTION 'Category is still used by active tasks, subtypes, or timetable items'
            USING ERRCODE = '23503';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

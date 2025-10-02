CREATE OR REPLACE FUNCTION fn_update_task(
    p_task_id INTEGER,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT NULL,
    p_updated_by INTEGER DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_is_completed BOOLEAN DEFAULT NULL,
    p_is_deleted BOOLEAN DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
    UPDATE tasks SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        priority = COALESCE(p_priority, priority),
        updated_on = NOW(),
        updated_by = COALESCE(p_updated_by, updated_by),
        start_time = COALESCE(p_start_time, start_time),
        end_time = COALESCE(p_end_time, end_time),
        duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
        isCompleted = COALESCE(p_is_completed, isCompleted),
        is_deleted = COALESCE(p_is_deleted, is_deleted)
    WHERE task_id = p_task_id;

    IF FOUND THEN
        RETURN p_task_id;
    ELSE
        RAISE EXCEPTION 'Task with id % does not exist.', p_task_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
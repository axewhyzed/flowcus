-- Existing-database upgrade for task ownership, persistent login state,
-- date-specific timetable rows, and the overlap trigger. Run after the base
-- schema and after enforce_timetable_item_integrity.sql has been installed.
BEGIN;

ALTER TABLE userlist ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_rate_limit_buckets (
    bucket_key VARCHAR(128) PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_window_start ON auth_rate_limit_buckets (window_start);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_on TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tasks_created_by_idempotency_key
    ON tasks (created_by, idempotency_key) WHERE idempotency_key IS NOT NULL;

UPDATE tasks SET title = 'Untitled task' WHERE title IS NULL OR length(btrim(title)) = 0;
ALTER TABLE tasks ALTER COLUMN title SET NOT NULL;
DO $$ BEGIN
    ALTER TABLE tasks ADD CONSTRAINT chk_title_nonempty CHECK (length(btrim(title)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE task_subtypes
        ADD CONSTRAINT uq_task_subtypes_id_user_category UNIQUE (id, user_id, category_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Preserve tasks while repairing legacy subtype references that violate ownership/category.
UPDATE tasks t
SET task_subtype_id = NULL
FROM task_subtypes s
WHERE t.task_subtype_id = s.id
  AND (t.created_by <> s.user_id OR t.task_category_id <> s.category_id);

DO $$ BEGIN
    ALTER TABLE tasks
        ADD CONSTRAINT fk_tasks_subtype_owner_category
        FOREIGN KEY (task_subtype_id, created_by, task_category_id)
        REFERENCES task_subtypes (id, user_id, category_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE timetable_items
        ADD CONSTRAINT chk_specific_date_day
        CHECK (specific_date IS NULL OR EXTRACT(DOW FROM specific_date)::INTEGER = day_of_week);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM timetable_items a
        JOIN timetable_items b ON a.timetable_id = b.timetable_id
          AND a.day_of_week = b.day_of_week
          AND a.id < b.id
          AND a.is_deleted = FALSE AND b.is_deleted = FALSE
          AND (a.specific_date IS NULL OR b.specific_date IS NULL OR a.specific_date = b.specific_date)
          AND a.start_time < b.end_time AND a.end_time > b.start_time
    ) THEN
        RAISE EXCEPTION 'Resolve existing overlapping timetable items before applying this migration.';
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_timetable_item_integrity ON timetable_items;
CREATE TRIGGER trg_timetable_item_integrity
    BEFORE INSERT OR UPDATE ON timetable_items
    FOR EACH ROW
    EXECUTE FUNCTION enforce_timetable_item_integrity();

DROP TRIGGER IF EXISTS trg_prevent_category_soft_delete_with_references ON task_category;
CREATE TRIGGER trg_prevent_category_soft_delete_with_references
    BEFORE UPDATE OF is_deleted ON task_category
    FOR EACH ROW
    EXECUTE FUNCTION prevent_category_soft_delete_with_references();

DROP TRIGGER IF EXISTS trg_task_integrity ON tasks;
CREATE TRIGGER trg_task_integrity
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_task_integrity();

COMMIT;

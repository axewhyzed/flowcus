-- =========================
-- timetable_items: entries in a timetable (links to task_subtypes)
-- day_of_week: 0=Sunday .. 6=Saturday
-- start_time/end_time stored as TIME (local) — if you want timezone-anchored datetimes, change to timestamptz
-- =========================

CREATE TABLE timetable_items (
    id SERIAL PRIMARY KEY,
    timetable_id INT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    task_category_id INT NOT NULL REFERENCES task_category(id), -- always required
    task_subtype_id INT REFERENCES task_subtypes(id) ON DELETE SET NULL DEFAULT NULL, -- optional
    day_of_week SMALLINT NOT NULL, -- 0=Sunday to 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    specific_date DATE, -- for one-off events (optional)
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE, -- soft delete flag with NOT NULL constraint
    updated_on TIMESTAMPTZ DEFAULT now(),
    
    -- CHECK constraints for data integrity
    CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT chk_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_specific_date_day CHECK (specific_date IS NULL OR EXTRACT(DOW FROM specific_date)::INTEGER = day_of_week)
);

CREATE TRIGGER trg_timetable_item_integrity
    BEFORE INSERT OR UPDATE ON timetable_items
    FOR EACH ROW
    EXECUTE FUNCTION enforce_timetable_item_integrity();

-- Existing indexes (automatically created)
-- timetable_items_pkey ON id (PRIMARY KEY)

-- Existing index from original schema
CREATE INDEX idx_timetable_items_timetable_day ON timetable_items (timetable_id, day_of_week) 
    WHERE is_deleted = FALSE;

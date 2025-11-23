-- =========================
-- timetable_items: entries in a timetable (links to task_subtypes)
-- day_of_week: 0=Sunday .. 6=Saturday
-- start_time/end_time stored as TIME (local) — if you want timezone-anchored datetimes, change to timestamptz
-- =========================

CREATE TABLE timetable_items (
    id SERIAL PRIMARY KEY,
    timetable_id INT NOT NULL REFERENCES timetables(id),
    task_category_id INT NOT NULL REFERENCES task_category(id), -- always required
    task_subtype_id INT REFERENCES task_subtypes(id) DEFAULT NULL, -- optional
    day_of_week SMALLINT NOT NULL, -- 0=Sunday to 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    specific_date DATE, -- for one-off events (optional)
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- CHECK constraints for data integrity
    CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT chk_time_order CHECK (end_time > start_time)
);

-- Existing indexes (automatically created)
-- timetable_items_pkey ON id (PRIMARY KEY)

-- Existing index from original schema
CREATE INDEX idx_timetable_items_timetable_day ON timetable_items (timetable_id, day_of_week) 
    WHERE is_deleted = FALSE;

-- Note: Consider adding mutual exclusivity constraint if specific_date and day_of_week 
-- should not both be set:
-- CONSTRAINT chk_date_xor_day CHECK ((specific_date IS NULL) != (day_of_week IS NULL))
-- This is commented out as it depends on your business logic requirements
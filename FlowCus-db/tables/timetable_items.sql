-- =========================
-- timetable_items: entries in a timetable (links to task_subtypes)
-- day_of_week: 0=Sunday .. 6=Saturday
-- start_time/end_time stored as TIME (local) — if you want timezone-anchored datetimes, change to timestamptz
-- =========================
CREATE TABLE timetable_items (
  id SERIAL PRIMARY KEY,
  timetable_id INT NOT NULL REFERENCES timetables(id),
  task_category_id INT NOT NULL REFERENCES task_category(id),   -- always required
  task_subtype_id INT REFERENCES task_subtypes(id) DEFAULT NULL, -- optional
  day_of_week SMALLINT NOT NULL, -- 0=Sunday to 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_timetable_items_timetable_day ON timetable_items (timetable_id, day_of_week) WHERE is_deleted = FALSE;
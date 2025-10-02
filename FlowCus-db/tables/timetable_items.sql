-- =========================
-- timetable_items: entries in a timetable (links to task_subtypes)
-- day_of_week: 0=Sunday .. 6=Saturday
-- start_time/end_time stored as TIME (local) — if you want timezone-anchored datetimes, change to timestamptz
-- =========================
CREATE TABLE timetable_items (
  id SERIAL PRIMARY KEY,
  timetable_id INT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  task_subtype_id INT NOT NULL REFERENCES task_subtypes(id) ON DELETE SET NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  specific_date DATE, -- optional override for one-off scheduling
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_timetable_items_timetable_day ON timetable_items (timetable_id, day_of_week) WHERE is_deleted = FALSE;
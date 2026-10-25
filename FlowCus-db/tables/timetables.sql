-- =========================
-- timetables: user can have multiple timetables (up to 5 enforced in service layer)
-- =========================

CREATE TABLE timetables (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES userlist(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_on TIMESTAMPTZ
);

-- Allow only one active timetable per user (partial unique index)
CREATE UNIQUE INDEX ux_one_active_timetable_per_user ON timetables (user_id) 
    WHERE is_active = TRUE AND is_deleted = FALSE;

CREATE INDEX idx_timetables_user ON timetables (user_id) 
    WHERE is_deleted = FALSE;

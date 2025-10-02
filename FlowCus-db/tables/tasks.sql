-- =========================
-- tasks: records of what user did (or does)
-- No JSONB, no auth_method, minimal fields as requested
-- =========================
CREATE TABLE tasks (
  task_id SERIAL PRIMARY KEY,
  task_subtype_id INT REFERENCES task_subtypes(id) ON DELETE SET NULL,
  title VARCHAR(200),
  description TEXT,
  priority INTEGER,
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INT NOT NULL REFERENCES userlist(id) ON DELETE CASCADE,
  updated_on TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER, -- optional; can be calculated in app or updated by DB job
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Useful index for dashboard queries (recent tasks by user)
CREATE INDEX idx_tasks_created_by_created_on ON tasks (created_by, created_on DESC) WHERE is_deleted = FALSE;
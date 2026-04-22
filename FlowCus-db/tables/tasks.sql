-- =========================
-- tasks: records of what user did (or does)
-- No JSONB, no auth_method, minimal fields as requested
-- =========================

CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    task_category_id INT NOT NULL REFERENCES task_category(id), -- always required
    task_subtype_id INT REFERENCES task_subtypes(id) DEFAULT NULL, -- optional
    title VARCHAR(200),
    description TEXT,
    priority INTEGER,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by INT NOT NULL REFERENCES userlist(id) ON DELETE CASCADE,
    updated_on TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER GENERATED ALWAYS AS (CASE WHEN end_time IS NOT NULL AND start_time IS NOT NULL THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER ELSE NULL END) STORED, -- auto-computed from timestamps
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- CHECK constraints for data integrity
    CONSTRAINT chk_priority CHECK (priority BETWEEN 1 AND 5),
    CONSTRAINT chk_time_order CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

-- Existing indexes (automatically created)
-- tasks_pkey ON task_id (PRIMARY KEY)

-- Existing index from original schema
CREATE INDEX idx_tasks_created_by_created_on ON tasks (created_by, created_on DESC) 
    WHERE is_deleted = FALSE;

-- New indexes for improved query performance
CREATE INDEX idx_tasks_category ON tasks(task_category_id) 
    WHERE is_deleted = false;

CREATE INDEX idx_tasks_subtype ON tasks(task_subtype_id) 
    WHERE is_deleted = false;

CREATE INDEX idx_tasks_created_on ON tasks(created_on DESC) 
    WHERE is_deleted = false;

CREATE INDEX idx_tasks_user_category ON tasks(created_by, task_category_id) 
    WHERE is_deleted = false;
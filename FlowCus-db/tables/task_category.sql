-- =========================
-- task_category: global categories
-- =========================

CREATE TABLE task_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_on TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    color_hex VARCHAR(7),
    icon_name VARCHAR(150)
);

-- Existing indexes (automatically created)
-- task_category_pkey ON id (PRIMARY KEY)

-- Partial unique index ensures unique names only among non-deleted categories
CREATE UNIQUE INDEX idx_task_category_unique_active_name ON task_category(name) 
    WHERE is_deleted = false;
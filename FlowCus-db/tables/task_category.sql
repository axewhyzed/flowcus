-- =========================
-- task_category: global categories
-- =========================

CREATE TABLE task_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    color_hex VARCHAR(7),
    icon_name VARCHAR(150)
);

-- Existing indexes (automatically created)
-- task_category_pkey ON id (PRIMARY KEY)
-- task_category_name_key ON name (UNIQUE)

-- New index for filtering active categories
CREATE INDEX idx_task_category_name ON task_category(name) 
    WHERE is_deleted = false;
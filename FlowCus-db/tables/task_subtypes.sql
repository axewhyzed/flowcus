-- =========================
-- task_subtypes: per-user subtypes (up to 5 per user enforced in service layer)
-- Stores color hex and icon name
-- =========================

CREATE TABLE task_subtypes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES userlist(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES task_category(id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    color_hex VARCHAR(7),
    icon_name VARCHAR(150),
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_on TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_task_subtypes_id_user_category UNIQUE (id, user_id, category_id)
);

CREATE INDEX idx_task_subtypes_user ON task_subtypes (user_id) 
    WHERE is_deleted = FALSE;

-- Allow users to recreate a subtype name after soft-deleting the old one.
CREATE UNIQUE INDEX idx_task_subtypes_unique_active_name
    ON task_subtypes (user_id, name)
    WHERE is_deleted = FALSE;

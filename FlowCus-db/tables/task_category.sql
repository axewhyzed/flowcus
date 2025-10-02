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
-- =========================
-- task_subtypes: per-user subtypes (max 5 per user enforced by trigger)
-- Stores color hex and Font Awesome icon name (FA6 assumed)
-- =========================
CREATE TABLE task_subtypes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES userlist(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES task_category(id) ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL,
  color_hex VARCHAR(7),     -- e.g. '#FFAA00'
  icon_name VARCHAR(150),   -- e.g. 'fa-solid fa-book' (Font Awesome 6)
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, name)
);

CREATE INDEX idx_task_subtypes_user ON task_subtypes (user_id) WHERE is_deleted = FALSE;


CREATE TRIGGER trg_limit_subtypes
  BEFORE INSERT OR UPDATE ON task_subtypes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_subtype_limit();
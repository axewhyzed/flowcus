-- Deprecated: Subtype limits are enforced in the application service layer.
-- This function is retained as a safe no-op for backward compatibility.
CREATE OR REPLACE FUNCTION enforce_subtype_limit()
RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

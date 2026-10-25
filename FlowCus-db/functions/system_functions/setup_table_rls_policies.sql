-- Compatibility wrapper for older setup instructions. Policies are managed centrally
-- so no table can accidentally receive a permissive USING (true) policy.
CREATE OR REPLACE FUNCTION public.setup_table_rls_policies(tbl_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF tbl_name NOT IN ('tasks', 'task_subtypes', 'timetables', 'timetable_items', 'task_category') THEN
        RAISE EXCEPTION 'Table % is not eligible for tenant RLS policies', tbl_name;
    END IF;
    PERFORM public.setup_rls_policies_all_tables();
END;
$$;

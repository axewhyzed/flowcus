-- Disables RLS and drops tenant policies
CREATE OR REPLACE FUNCTION public.setup_rls_policies_all_tables()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['tasks', 'task_subtypes', 'timetables', 'timetable_items', 'task_category'] LOOP
        IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', tbl);
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('DROP POLICY IF EXISTS flowcus_user_scope ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS flowcus_category_read ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS flowcus_category_admin ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS flowcus_timetable_items_scope ON public.%I', tbl);
        END IF;
    END LOOP;
    RETURN 'RLS disabled and policies removed';
END;
$$;

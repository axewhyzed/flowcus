-- Enables fail-closed RLS for user-owned application tables.
-- The API sets transaction-local app.user_id/app.is_admin values on each connection.
-- The API database role must not be a superuser; superusers always bypass RLS.
-- Execute after the base tables have been created:
--   SELECT public.setup_rls_policies_all_tables();

CREATE OR REPLACE FUNCTION public.setup_rls_policies_all_tables()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['tasks', 'task_subtypes', 'timetables', 'timetable_items', 'task_category'] LOOP
        IF to_regclass(format('public.%I', table_name)) IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

        -- Remove the former permissive blanket policies if this function was run before.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'appuser_select_all_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'appuser_insert_all_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'appuser_update_all_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'appguest_select_all_' || table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'flowcus_user_scope', table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'flowcus_category_read', table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'flowcus_category_admin', table_name);

        IF table_name = 'tasks' THEN
            EXECUTE $policy$CREATE POLICY flowcus_user_scope ON public.tasks
                USING (created_by = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                    OR current_setting('app.is_admin', true) = 'true')
                WITH CHECK (created_by = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                    OR current_setting('app.is_admin', true) = 'true')$policy$;
        ELSIF table_name = 'task_subtypes' THEN
            EXECUTE $policy$CREATE POLICY flowcus_user_scope ON public.task_subtypes
                USING (user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                    OR current_setting('app.is_admin', true) = 'true')
                WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                    OR current_setting('app.is_admin', true) = 'true')$policy$;
        ELSIF table_name = 'timetables' THEN
            EXECUTE $policy$CREATE POLICY flowcus_user_scope ON public.timetables
                USING (user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                    OR current_setting('app.is_admin', true) = 'true')
                WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
                    OR current_setting('app.is_admin', true) = 'true')$policy$;
        ELSIF table_name = 'timetable_items' THEN
            EXECUTE $policy$CREATE POLICY flowcus_user_scope ON public.timetable_items
                USING (
                    EXISTS (SELECT 1 FROM public.timetables t
                    WHERE t.id = timetable_items.timetable_id
                      AND t.user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER)
                    OR current_setting('app.is_admin', true) = 'true'
                )
                WITH CHECK (
                    EXISTS (SELECT 1 FROM public.timetables t
                    WHERE t.id = timetable_items.timetable_id
                      AND t.user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER)
                    OR current_setting('app.is_admin', true) = 'true'
                )$policy$;
        ELSE
            EXECUTE $policy$CREATE POLICY flowcus_category_read ON public.task_category
                FOR SELECT USING (true)$policy$;
            EXECUTE $policy$CREATE POLICY flowcus_category_admin ON public.task_category
                FOR ALL USING (current_setting('app.is_admin', true) = 'true')
                WITH CHECK (current_setting('app.is_admin', true) = 'true')$policy$;
        END IF;
    END LOOP;

    RETURN 'RLS policies applied to user-owned data and shared task categories.';
END;
$$;

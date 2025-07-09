---- FUNCTION USAGE ----:
-- Applies RLS + policies to ALL public tables
-- SELECT * FROM setup_rls_policies_all_tables();

CREATE OR REPLACE FUNCTION public.setup_rls_policies_all_tables()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    tbl_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    error_messages TEXT := '';
BEGIN
    RAISE NOTICE 'Starting RLS policy setup for all tables in public schema...';
    
    FOR tbl_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        -- Optionally exclude specific tables:
        -- AND table_name NOT IN ('knex_migrations', 'other_excluded_table')
    LOOP
        BEGIN
            -- Enable RLS on the table
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_record.table_name);
            
            -- Drop existing policies first to avoid conflicts
            EXECUTE format('DROP POLICY IF EXISTS "appuser_select_all_%s" ON %I', tbl_record.table_name, tbl_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS "appuser_insert_all_%s" ON %I', tbl_record.table_name, tbl_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS "appuser_update_all_%s" ON %I', tbl_record.table_name, tbl_record.table_name);
            EXECUTE format('DROP POLICY IF EXISTS "appguest_select_all_%s" ON %I', tbl_record.table_name, tbl_record.table_name);
            
            -- Create appuser policies
            EXECUTE format('
                CREATE POLICY "appuser_select_all_%s" 
                ON %I 
                FOR SELECT 
                TO appuser 
                USING (true)', 
                tbl_record.table_name, tbl_record.table_name);
                
            EXECUTE format('
                CREATE POLICY "appuser_insert_all_%s" 
                ON %I 
                FOR INSERT 
                TO appuser 
                WITH CHECK (true)', 
                tbl_record.table_name, tbl_record.table_name);
                
            EXECUTE format('
                CREATE POLICY "appuser_update_all_%s" 
                ON %I 
                FOR UPDATE 
                TO appuser 
                USING (true) 
                WITH CHECK (true)', 
                tbl_record.table_name, tbl_record.table_name);
            
            -- Create appguest policy
            EXECUTE format('
                CREATE POLICY "appguest_select_all_%s" 
                ON %I 
                FOR SELECT 
                TO appguest 
                USING (true)', 
                tbl_record.table_name, tbl_record.table_name);
            
            RAISE NOTICE 'Applied RLS policies to table: %', tbl_record.table_name;
            success_count := success_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_messages := error_messages || 
                format('Table %s: %s | ', tbl_record.table_name, SQLERRM);
            RAISE WARNING 'Failed to apply RLS to %: %', tbl_record.table_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN format(
        'Completed RLS policy setup. Success: %s, Errors: %s. Error details: %s',
        success_count,
        error_count,
        CASE WHEN error_messages = '' THEN 'None' ELSE error_messages END
    );
END;
$$;
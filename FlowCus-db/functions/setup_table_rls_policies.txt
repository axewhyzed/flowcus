---- FUNCTION USAGE ---- :
--After creating a new table:
--SELECT setup_table_rls_policies('your_new_table');

--To update policies on an existing table:
--SELECT setup_table_rls_policies('existing_table');

--For multiple tables:
--SELECT setup_table_rls_policies('table1');
--SELECT setup_table_rls_policies('table2');

CREATE OR REPLACE FUNCTION public.setup_table_rls_policies(tbl_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- Critical security addition
AS $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = tbl_name
    ) THEN
        RAISE EXCEPTION 'Table "%" does not exist in public schema', tbl_name;
    END IF;
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
    
    -- Drop existing policies if they exist (to avoid conflicts)
    EXECUTE format('
        DROP POLICY IF EXISTS "appuser_select_all_%s" ON %I',
        tbl_name, tbl_name);
    EXECUTE format('
        DROP POLICY IF EXISTS "appuser_insert_all_%s" ON %I',
        tbl_name, tbl_name);
    EXECUTE format('
        DROP POLICY IF EXISTS "appuser_update_all_%s" ON %I',
        tbl_name, tbl_name);
    EXECUTE format('
        DROP POLICY IF EXISTS "appguest_select_all_%s" ON %I',
        tbl_name, tbl_name);
    
    -- Create new policies (same as before)
    EXECUTE format('
        CREATE POLICY "appuser_select_all_%s" 
        ON %I 
        FOR SELECT 
        TO appuser 
        USING (true)', 
        tbl_name, tbl_name);
        
    EXECUTE format('
        CREATE POLICY "appuser_insert_all_%s" 
        ON %I 
        FOR INSERT 
        TO appuser 
        WITH CHECK (true)', 
        tbl_name, tbl_name);
        
    EXECUTE format('
        CREATE POLICY "appuser_update_all_%s" 
        ON %I 
        FOR UPDATE 
        TO appuser 
        USING (true) 
        WITH CHECK (true)', 
        tbl_name, tbl_name);
    
    EXECUTE format('
        CREATE POLICY "appguest_select_all_%s" 
        ON %I 
        FOR SELECT 
        TO appguest 
        USING (true)', 
        tbl_name, tbl_name);
    
    RAISE NOTICE 'Successfully configured RLS and policies for table: %', tbl_name;
END;
$$;
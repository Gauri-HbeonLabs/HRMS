-- Fix departments policies
DROP POLICY IF EXISTS "departments_insert" ON departments;
DROP POLICY IF EXISTS "departments_update" ON departments;
DROP POLICY IF EXISTS "departments_delete" ON departments;

CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated 
  USING (has_role(ARRAY['ceo']::user_role[]));

-- Fix projects policies
DROP POLICY IF EXISTS "projects_insert" ON projects;

CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['manager', 'hr', 'ceo']::user_role[]));

-- Fix leave_types policies
DROP POLICY IF EXISTS "leave_types_insert" ON leave_types;
DROP POLICY IF EXISTS "leave_types_update" ON leave_types;

CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr']::user_role[]));

CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr']::user_role[]));

-- Fix holidays policies
DROP POLICY IF EXISTS "holidays_insert" ON holidays;
DROP POLICY IF EXISTS "holidays_update" ON holidays;
DROP POLICY IF EXISTS "holidays_delete" ON holidays;

CREATE POLICY "holidays_insert" ON holidays FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "holidays_update" ON holidays FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "holidays_delete" ON holidays FOR DELETE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));
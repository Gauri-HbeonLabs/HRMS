-- Drop the problematic policies on employees
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;

-- Create a security definer function to check user role without recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM employees WHERE id = user_id;
$$;

-- Also create a function to check if user has specific role
CREATE OR REPLACE FUNCTION has_role(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = ANY(required_roles)
  );
$$;

-- Recreate employees policies using the security definer functions
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated 
  USING (
    id = auth.uid() OR has_role(ARRAY['hr', 'manager', 'ceo']::user_role[])
  );

CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]) OR id = auth.uid());

CREATE POLICY "employees_update" ON employees FOR UPDATE TO authenticated 
  USING (id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]))
  WITH CHECK (id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "employees_delete" ON employees FOR DELETE TO authenticated 
  USING (has_role(ARRAY['ceo']::user_role[]));

-- Fix leaves policies that also reference employees
DROP POLICY IF EXISTS "leaves_select" ON leaves;
DROP POLICY IF EXISTS "leaves_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_update" ON leaves;
DROP POLICY IF EXISTS "leaves_delete" ON leaves;

CREATE POLICY "leaves_select" ON leaves FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'manager', 'ceo']::user_role[]));

CREATE POLICY "leaves_insert" ON leaves FOR INSERT TO authenticated 
  WITH CHECK (employee_id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "leaves_update" ON leaves FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr', 'manager', 'ceo']::user_role[]));

CREATE POLICY "leaves_delete" ON leaves FOR DELETE TO authenticated 
  USING (employee_id = auth.uid() AND status = 'pending');

-- Fix leave_balances policies
DROP POLICY IF EXISTS "leave_balances_select" ON leave_balances;
DROP POLICY IF EXISTS "leave_balances_insert" ON leave_balances;
DROP POLICY IF EXISTS "leave_balances_update" ON leave_balances;

CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'manager', 'ceo']::user_role[]));

CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr']::user_role[]));

CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr']::user_role[]));

-- Fix projects policies
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated 
  USING (manager_id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));

-- Fix project_members policies
DROP POLICY IF EXISTS "project_members_insert" ON project_members;
DROP POLICY IF EXISTS "project_members_delete" ON project_members;

CREATE POLICY "project_members_insert" ON project_members FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['manager', 'hr', 'ceo']::user_role[]));

CREATE POLICY "project_members_delete" ON project_members FOR DELETE TO authenticated 
  USING (has_role(ARRAY['manager', 'hr', 'ceo']::user_role[]));

-- Fix payroll_records policies
DROP POLICY IF EXISTS "payroll_records_select" ON payroll_records;
DROP POLICY "payroll_records_insert" ON payroll_records;
DROP POLICY IF EXISTS "payroll_records_update" ON payroll_records;

CREATE POLICY "payroll_records_select" ON payroll_records FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'manager', 'ceo']::user_role[]));

CREATE POLICY "payroll_records_insert" ON payroll_records FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "payroll_records_update" ON payroll_records FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));

-- Fix payslips policies
DROP POLICY IF EXISTS "payslips_select" ON payslips;
DROP POLICY IF EXISTS "payslips_insert" ON payslips;
DROP POLICY IF EXISTS "payslips_update" ON payslips;

CREATE POLICY "payslips_select" ON payslips FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "payslips_insert" ON payslips FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "payslips_update" ON payslips FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr']::user_role[]));

-- Fix salary_structures policies
DROP POLICY IF EXISTS "salary_structures_select" ON salary_structures;
DROP POLICY IF EXISTS "salary_structures_insert" ON salary_structures;
DROP POLICY IF EXISTS "salary_structures_update" ON salary_structures;

CREATE POLICY "salary_structures_select" ON salary_structures FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "salary_structures_insert" ON salary_structures FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "salary_structures_update" ON salary_structures FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));

-- Fix attendance policies
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;

CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'manager', 'ceo']::user_role[]));

CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated 
  WITH CHECK (employee_id = auth.uid() OR has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated 
  USING (employee_id = auth.uid() OR has_role(ARRAY['hr', 'manager', 'ceo']::user_role[]));

-- Fix payroll_periods policies
DROP POLICY IF EXISTS "payroll_periods_insert" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_update" ON payroll_periods;

CREATE POLICY "payroll_periods_insert" ON payroll_periods FOR INSERT TO authenticated 
  WITH CHECK (has_role(ARRAY['hr', 'ceo']::user_role[]));

CREATE POLICY "payroll_periods_update" ON payroll_periods FOR UPDATE TO authenticated 
  USING (has_role(ARRAY['hr', 'ceo']::user_role[]));
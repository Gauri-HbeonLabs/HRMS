-- RLS Policies for departments
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'ceo'));

-- RLS Policies for employees
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated 
  USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'manager', 'ceo'))
  );
CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "employees_update" ON employees FOR UPDATE TO authenticated 
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "employees_delete" ON employees FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'ceo'));

-- RLS Policies for projects
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('manager', 'hr', 'ceo')));
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated 
  USING (manager_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));

-- RLS Policies for project_members
CREATE POLICY "project_members_select" ON project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_members_insert" ON project_members FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('manager', 'hr', 'ceo')));
CREATE POLICY "project_members_delete" ON project_members FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('manager', 'hr', 'ceo')));

-- RLS Policies for leave_types
CREATE POLICY "leave_types_select" ON leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_types_insert" ON leave_types FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'hr'));
CREATE POLICY "leave_types_update" ON leave_types FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'hr'));

-- RLS Policies for leave_balances
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'manager', 'ceo')));
CREATE POLICY "leave_balances_insert" ON leave_balances FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'hr'));
CREATE POLICY "leave_balances_update" ON leave_balances FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'hr'));

-- RLS Policies for leaves
CREATE POLICY "leaves_select" ON leaves FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'manager', 'ceo')));
CREATE POLICY "leaves_insert" ON leaves FOR INSERT TO authenticated 
  WITH CHECK (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "leaves_update" ON leaves FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees e WHERE e.id = auth.uid() AND e.role IN ('hr', 'manager', 'ceo')));
CREATE POLICY "leaves_delete" ON leaves FOR DELETE TO authenticated 
  USING (employee_id = auth.uid() AND status = 'pending');

-- RLS Policies for payroll_periods
CREATE POLICY "payroll_periods_select" ON payroll_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "payroll_periods_insert" ON payroll_periods FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "payroll_periods_update" ON payroll_periods FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));

-- RLS Policies for salary_structures
CREATE POLICY "salary_structures_select" ON salary_structures FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "salary_structures_insert" ON salary_structures FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "salary_structures_update" ON salary_structures FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));

-- RLS Policies for payroll_records
CREATE POLICY "payroll_records_select" ON payroll_records FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'manager', 'ceo')));
CREATE POLICY "payroll_records_insert" ON payroll_records FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "payroll_records_update" ON payroll_records FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));

-- RLS Policies for payslips
CREATE POLICY "payslips_select" ON payslips FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "payslips_insert" ON payslips FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "payslips_update" ON payslips FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'hr'));

-- RLS Policies for attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'manager', 'ceo')));
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated 
  WITH CHECK (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated 
  USING (employee_id = auth.uid() OR EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'manager', 'ceo')));

-- RLS Policies for holidays
CREATE POLICY "holidays_select" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_insert" ON holidays FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "holidays_update" ON holidays FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
CREATE POLICY "holidays_delete" ON holidays FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('hr', 'ceo')));
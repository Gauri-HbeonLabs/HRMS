-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle leave approval/rejection
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE leave_balances 
    SET used_days = used_days + NEW.days_count
    WHERE employee_id = NEW.employee_id 
    AND leave_type_id = NEW.leave_type_id 
    AND year = EXTRACT(YEAR FROM NEW.start_date);
  ELSIF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    UPDATE leave_balances 
    SET used_days = used_days - OLD.days_count
    WHERE employee_id = NEW.employee_id 
    AND leave_type_id = OLD.leave_type_id 
    AND year = EXTRACT(YEAR FROM OLD.start_date);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leave_balance_trigger AFTER UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_leave_balance();
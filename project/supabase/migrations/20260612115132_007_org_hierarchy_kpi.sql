-- Add department hierarchy and head
ALTER TABLE departments ADD COLUMN parent_department_id UUID REFERENCES departments(id);
ALTER TABLE departments ADD COLUMN head_id UUID REFERENCES employees(id);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES employees(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, department_id)
);

-- KPI scorecards
CREATE TABLE kpi_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  weight DECIMAL(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kpi_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  kpi_category_id UUID NOT NULL REFERENCES kpi_categories(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_value DECIMAL(12,2) NOT NULL,
  actual_value DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT '%',
  period_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  period_quarter INTEGER CHECK (period_quarter BETWEEN 1 AND 4),
  weight DECIMAL(5,2) DEFAULT 100,
  status VARCHAR(20) DEFAULT 'on_track',
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_scorecards ENABLE ROW LEVEL SECURITY;

-- Teams RLS
CREATE POLICY "select_teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager')));
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager'))) WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager')));
CREATE POLICY "delete_teams" ON teams FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));

-- KPI categories RLS
CREATE POLICY "select_kpi_categories" ON kpi_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_kpi_categories" ON kpi_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));
CREATE POLICY "update_kpi_categories" ON kpi_categories FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo'))) WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));
CREATE POLICY "delete_kpi_categories" ON kpi_categories FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));

-- KPI scorecards RLS
CREATE POLICY "select_own_kpi" ON kpi_scorecards FOR SELECT TO authenticated USING (auth.uid() = employee_id OR auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager')));
CREATE POLICY "insert_kpi" ON kpi_scorecards FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager')));
CREATE POLICY "update_kpi" ON kpi_scorecards FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager'))) WITH CHECK (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo', 'manager')));
CREATE POLICY "delete_kpi" ON kpi_scorecards FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM employees WHERE role IN ('hr', 'ceo')));

-- Default KPI categories
INSERT INTO kpi_categories (name, description, weight) VALUES
('Productivity', 'Work output and efficiency metrics', 30),
('Quality', 'Accuracy and quality of deliverables', 25),
('Attendance', 'Punctuality and attendance record', 15),
('Teamwork', 'Collaboration and communication', 15),
('Initiative', 'Proactive problem-solving and leadership', 15);

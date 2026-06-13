-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
CREATE TYPE user_role AS ENUM ('employee', 'hr', 'manager', 'ceo');

-- Status enums
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold', 'cancelled');

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table (extends Supabase auth.users)
CREATE TABLE employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department_id UUID REFERENCES departments(id),
  designation VARCHAR(100),
  role user_role DEFAULT 'employee',
  manager_id UUID REFERENCES employees(id),
  date_of_joining DATE NOT NULL,
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(10),
  avatar_url TEXT,
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  pan_number VARCHAR(20),
  aadhaar_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status project_status DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(15,2),
  department_id UUID REFERENCES departments(id),
  manager_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members junction table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_id)
);

-- Leave types table
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  days_allowed INTEGER NOT NULL,
  description TEXT,
  is_paid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave balances table
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL,
  used_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaves table
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count DECIMAL(4,2) NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll periods table
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Salary structure table
CREATE TABLE salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12,2) NOT NULL,
  hra DECIMAL(12,2) DEFAULT 0,
  conveyance DECIMAL(12,2) DEFAULT 0,
  medical DECIMAL(12,2) DEFAULT 0,
  special_allowance DECIMAL(12,2) DEFAULT 0,
  pf_deduction DECIMAL(12,2) DEFAULT 0,
  esi_deduction DECIMAL(12,2) DEFAULT 0,
  professional_tax DECIMAL(12,2) DEFAULT 0,
  income_tax DECIMAL(12,2) DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll records (from Excel upload)
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id),
  employee_id UUID REFERENCES employees(id),
  employee_code VARCHAR(50),
  basic_salary DECIMAL(12,2),
  hra DECIMAL(12,2),
  conveyance DECIMAL(12,2),
  medical DECIMAL(12,2),
  special_allowance DECIMAL(12,2),
  overtime DECIMAL(12,2),
  bonus DECIMAL(12,2),
  pf_deduction DECIMAL(12,2),
  esi_deduction DECIMAL(12,2),
  professional_tax DECIMAL(12,2),
  income_tax DECIMAL(12,2),
  other_deductions DECIMAL(12,2),
  gross_salary DECIMAL(12,2),
  net_salary DECIMAL(12,2),
  days_worked INTEGER,
  lop_days DECIMAL(4,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_period_id, employee_id)
);

-- Payslips table
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID REFERENCES payroll_records(id),
  employee_id UUID REFERENCES employees(id),
  payslip_number VARCHAR(50) UNIQUE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ
);

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  work_hours DECIMAL(4,2),
  status VARCHAR(20) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Holidays table
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Insert default leave types
INSERT INTO leave_types (name, days_allowed, description, is_paid) VALUES
('Casual Leave', 12, 'Casual leave for personal matters', TRUE),
('Sick Leave', 6, 'Leave for medical reasons', TRUE),
('Earned Leave', 15, 'Earned/privilege leave', TRUE),
('Comp Off', 5, 'Compensatory off', TRUE),
('Maternity Leave', 180, 'Maternity leave', TRUE),
('Paternity Leave', 5, 'Paternity leave', TRUE);

-- Insert default departments
INSERT INTO departments (name, description) VALUES
('Engineering', 'Software Development Team'),
('Human Resources', 'HR Department'),
('Finance', 'Finance and Accounting'),
('Marketing', 'Marketing and Sales'),
('Operations', 'Operations and Administration'),
('Executive', 'Executive Leadership');
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Enums: {
      user_role: 'employee' | 'hr' | 'manager' | 'ceo'
      leave_status: 'pending' | 'approved' | 'rejected'
      project_status: 'active' | 'completed' | 'on_hold' | 'cancelled'
    }
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          employee_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          department_id: string | null
          designation: string | null
          role: Database['public']['Enums']['user_role']
          manager_id: string | null
          date_of_joining: string
          date_of_birth: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string
          pincode: string | null
          avatar_url: string | null
          bank_name: string | null
          bank_account: string | null
          ifsc_code: string | null
          pan_number: string | null
          aadhaar_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          employee_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          department_id?: string | null
          designation?: string | null
          role?: Database['public']['Enums']['user_role']
          manager_id?: string | null
          date_of_joining: string
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string
          pincode?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bank_account?: string | null
          ifsc_code?: string | null
          pan_number?: string | null
          aadhaar_number?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          department_id?: string | null
          designation?: string | null
          role?: Database['public']['Enums']['user_role']
          manager_id?: string | null
          date_of_joining?: string
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string
          pincode?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bank_account?: string | null
          ifsc_code?: string | null
          pan_number?: string | null
          aadhaar_number?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: Database['public']['Enums']['project_status']
          start_date: string
          end_date: string | null
          budget: number | null
          department_id: string | null
          manager_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: Database['public']['Enums']['project_status']
          start_date: string
          end_date?: string | null
          budget?: number | null
          department_id?: string | null
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: Database['public']['Enums']['project_status']
          start_date?: string
          end_date?: string | null
          budget?: number | null
          department_id?: string | null
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          employee_id: string
          role: string
          assigned_at: string
        }
        Insert: {
          id?: string
          project_id: string
          employee_id: string
          role?: string
          assigned_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          employee_id?: string
          role?: string
          assigned_at?: string
        }
      }
      leave_types: {
        Row: {
          id: string
          name: string
          days_allowed: number
          description: string | null
          is_paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          days_allowed: number
          description?: string | null
          is_paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          days_allowed?: number
          description?: string | null
          is_paid?: boolean
          created_at?: string
        }
      }
      leave_balances: {
        Row: {
          id: string
          employee_id: string
          leave_type_id: string
          year: number
          total_days: number
          used_days: number
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type_id: string
          year: number
          total_days: number
          used_days?: number
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type_id?: string
          year?: number
          total_days?: number
          used_days?: number
          created_at?: string
        }
      }
      leaves: {
        Row: {
          id: string
          employee_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          days_count: number
          reason: string | null
          status: Database['public']['Enums']['leave_status']
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          days_count: number
          reason?: string | null
          status?: Database['public']['Enums']['leave_status']
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type_id?: string
          start_date?: string
          end_date?: string
          days_count?: number
          reason?: string | null
          status?: Database['public']['Enums']['leave_status']
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payroll_periods: {
        Row: {
          id: string
          month: number
          year: number
          start_date: string
          end_date: string
          is_processed: boolean
          processed_at: string | null
          processed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          month: number
          year: number
          start_date: string
          end_date: string
          is_processed?: boolean
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          month?: number
          year?: number
          start_date?: string
          end_date?: string
          is_processed?: boolean
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string
        }
      }
      salary_structures: {
        Row: {
          id: string
          employee_id: string
          basic_salary: number
          hra: number
          conveyance: number
          medical: number
          special_allowance: number
          pf_deduction: number
          esi_deduction: number
          professional_tax: number
          income_tax: number
          effective_from: string
          effective_to: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          basic_salary: number
          hra?: number
          conveyance?: number
          medical?: number
          special_allowance?: number
          pf_deduction?: number
          esi_deduction?: number
          professional_tax?: number
          income_tax?: number
          effective_from: string
          effective_to?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          basic_salary?: number
          hra?: number
          conveyance?: number
          medical?: number
          special_allowance?: number
          pf_deduction?: number
          esi_deduction?: number
          professional_tax?: number
          income_tax?: number
          effective_from?: string
          effective_to?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payroll_records: {
        Row: {
          id: string
          payroll_period_id: string
          employee_id: string
          employee_code: string | null
          basic_salary: number | null
          hra: number | null
          conveyance: number | null
          medical: number | null
          special_allowance: number | null
          overtime: number | null
          bonus: number | null
          pf_deduction: number | null
          esi_deduction: number | null
          professional_tax: number | null
          income_tax: number | null
          other_deductions: number | null
          gross_salary: number | null
          net_salary: number | null
          days_worked: number | null
          lop_days: number | null
          is_paid: boolean
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payroll_period_id: string
          employee_id: string
          employee_code?: string | null
          basic_salary?: number | null
          hra?: number | null
          conveyance?: number | null
          medical?: number | null
          special_allowance?: number | null
          overtime?: number | null
          bonus?: number | null
          pf_deduction?: number | null
          esi_deduction?: number | null
          professional_tax?: number | null
          income_tax?: number | null
          other_deductions?: number | null
          gross_salary?: number | null
          net_salary?: number | null
          days_worked?: number | null
          lop_days?: number | null
          is_paid?: boolean
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payroll_period_id?: string
          employee_id?: string
          employee_code?: string | null
          basic_salary?: number | null
          hra?: number | null
          conveyance?: number | null
          medical?: number | null
          special_allowance?: number | null
          overtime?: number | null
          bonus?: number | null
          pf_deduction?: number | null
          esi_deduction?: number | null
          professional_tax?: number | null
          income_tax?: number | null
          other_deductions?: number | null
          gross_salary?: number | null
          net_salary?: number | null
          days_worked?: number | null
          lop_days?: number | null
          is_paid?: boolean
          paid_at?: string | null
          created_at?: string
        }
      }
      payslips: {
        Row: {
          id: string
          payroll_record_id: string
          employee_id: string
          payslip_number: string
          month: number
          year: number
          generated_at: string
          pdf_url: string | null
          is_sent: boolean
          sent_at: string | null
        }
        Insert: {
          id?: string
          payroll_record_id: string
          employee_id: string
          payslip_number: string
          month: number
          year: number
          generated_at?: string
          pdf_url?: string | null
          is_sent?: boolean
          sent_at?: string | null
        }
        Update: {
          id?: string
          payroll_record_id?: string
          employee_id?: string
          payslip_number?: string
          month?: number
          year?: number
          generated_at?: string
          pdf_url?: string | null
          is_sent?: boolean
          sent_at?: string | null
        }
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          date: string
          check_in: string | null
          check_out: string | null
          work_hours: number | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          check_in?: string | null
          check_out?: string | null
          work_hours?: number | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          check_in?: string | null
          check_out?: string | null
          work_hours?: number | null
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      holidays: {
        Row: {
          id: string
          name: string
          date: string
          is_optional: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          is_optional?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          is_optional?: boolean
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    CompositeTypes: {}
  }
}

export type Department = Database['public']['Tables']['departments']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type LeaveType = Database['public']['Tables']['leave_types']['Row']
export type LeaveBalance = Database['public']['Tables']['leave_balances']['Row']
export type Leave = Database['public']['Tables']['leaves']['Row']
export type PayrollPeriod = Database['public']['Tables']['payroll_periods']['Row']
export type SalaryStructure = Database['public']['Tables']['salary_structures']['Row']
export type PayrollRecord = Database['public']['Tables']['payroll_records']['Row']
export type Payslip = Database['public']['Tables']['payslips']['Row']
export type Attendance = Database['public']['Tables']['attendance']['Row']
export type Holiday = Database['public']['Tables']['holidays']['Row']

export type UserRole = Database['public']['Enums']['user_role']
export type LeaveStatus = Database['public']['Enums']['leave_status']
export type ProjectStatus = Database['public']['Enums']['project_status']

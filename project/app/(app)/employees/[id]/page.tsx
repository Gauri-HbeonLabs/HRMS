// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Employee, Department, SalaryStructure, LeaveBalance } from '@/lib/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  CreditCard,
  Wallet,
  Banknote,
  Hash,
  FileText,
} from 'lucide-react'

interface EmployeeDetail extends Employee {
  department: Department | null
  manager: { first_name: string; last_name: string } | null
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isRole } = useAuth()
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [salary, setSalary] = useState<SalaryStructure | null>(null)
  const [leaveBalances, setLeaveBalances] = useState<(LeaveBalance & { leave_type: { name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchEmployee()
  }, [params.id])

  const fetchEmployee = async () => {
    setLoading(true)

    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(*)
      `)
      .eq('id', params.id)
      .single()

    if (empError) {
      toast({ title: 'Error', description: empError.message, variant: 'destructive' })
      router.push('/employees')
      return
    }

    // Fetch manager separately if exists
    let managerData = null
    if (empData?.manager_id) {
      const { data: mgrData } = await supabase
        .from('employees')
        .select('first_name, last_name')
        .eq('id', empData.manager_id)
        .single()
      managerData = mgrData
    }

    setEmployee({ ...empData, manager: managerData })

    if (isRole('hr', 'ceo')) {
      const { data: salaryData } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('employee_id', params.id)
        .eq('is_active', true)
        .single()

      setSalary(salaryData || null)
    }

    const currentYear = new Date().getFullYear()
    const { data: balances } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_type:leave_types(name)
      `)
      .eq('employee_id', params.id)
      .eq('year', currentYear)

    setLeaveBalances(balances || [])
    setLoading(false)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'default'
      case 'hr':
        return 'secondary'
      case 'manager':
        return 'outline'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  if (!employee) {
    return <div>Employee not found</div>
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-3xl font-bold text-white">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </div>
              <h2 className="mt-4 text-xl font-bold">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-slate-500">{employee.designation}</p>
              <Badge variant={getRoleBadgeVariant(employee.role)} className="mt-2 capitalize">
                {employee.role}
              </Badge>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <Hash className="h-3 w-3" />
                {employee.employee_id}
              </div>
              <div className="mt-4 w-full space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4" />
                    {employee.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4" />
                  {employee.department?.name || 'No Department'}
                </div>
                {employee.manager && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-medium">Manager:</span>
                    {employee.manager.first_name} {employee.manager.last_name}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  Joined: {new Date(employee.date_of_joining).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList>
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              {isRole('hr', 'ceo') && <TabsTrigger value="salary">Salary</TabsTrigger>}
              <TabsTrigger value="leaves">Leave Balance</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Employee ID</p>
                    <p className="font-medium">{employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Date of Birth</p>
                    <p className="font-medium">
                      {employee.date_of_birth
                        ? new Date(employee.date_of_birth).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">PAN Number</p>
                    <p className="font-medium">{employee.pan_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Aadhaar Number</p>
                    <p className="font-medium">{employee.aadhaar_number || '-'}</p>
                  </div>
                  {employee.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-slate-500">Address</p>
                      <p className="font-medium flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        <span>
                          {employee.address}
                          {employee.city && `, ${employee.city}`}
                          {employee.state && `, ${employee.state}`}
                          {employee.pincode && ` - ${employee.pincode}`}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Bank Name</p>
                    <p className="font-medium">{employee.bank_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Account Number</p>
                    <p className="font-medium">{employee.bank_account || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">IFSC Code</p>
                    <p className="font-medium">{employee.ifsc_code || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isRole('hr', 'ceo') && (
              <TabsContent value="salary">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Salary Structure
                    </CardTitle>
                    <CardDescription>Current active salary structure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salary ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="mb-3 font-semibold text-slate-900">Earnings</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                              <span className="text-slate-600">Basic Salary</span>
                              <span className="font-semibold">
                                Rs. {salary.basic_salary.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                              <span className="text-slate-600">HRA</span>
                              <span className="font-semibold">
                                Rs. {salary.hra?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                              <span className="text-slate-600">Conveyance</span>
                              <span className="font-semibold">
                                Rs. {salary.conveyance?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                              <span className="text-slate-600">Medical</span>
                              <span className="font-semibold">
                                Rs. {salary.medical?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                              <span className="text-slate-600">Special Allowance</span>
                              <span className="font-semibold">
                                Rs. {salary.special_allowance?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 font-semibold text-slate-900">Deductions</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                              <span className="text-slate-600">PF</span>
                              <span className="font-semibold text-red-600">
                                Rs. {salary.pf_deduction?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                              <span className="text-slate-600">ESI</span>
                              <span className="font-semibold text-red-600">
                                Rs. {salary.esi_deduction?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                              <span className="text-slate-600">Professional Tax</span>
                              <span className="font-semibold text-red-600">
                                Rs. {salary.professional_tax?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                              <span className="text-slate-600">Income Tax</span>
                              <span className="font-semibold text-red-600">
                                Rs. {salary.income_tax?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
                          <span className="text-lg font-semibold text-blue-900">Net Salary (Monthly)</span>
                          <span className="text-2xl font-bold text-blue-600">
                            Rs.{' '}
                            {(
                              salary.basic_salary +
                              (salary.hra || 0) +
                              (salary.conveyance || 0) +
                              (salary.medical || 0) +
                              (salary.special_allowance || 0) -
                              (salary.pf_deduction || 0) -
                              (salary.esi_deduction || 0) -
                              (salary.professional_tax || 0) -
                              (salary.income_tax || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <Banknote className="h-12 w-12 mb-2" />
                        <p>No salary structure found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="leaves">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Leave Balance ({new Date().getFullYear()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {leaveBalances.length > 0 ? (
                    <div className="space-y-4">
                      {leaveBalances.map((balance) => (
                        <div
                          key={balance.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <p className="font-medium">{balance.leave_type.name}</p>
                            <p className="text-sm text-slate-500">
                              Used: {balance.used_days} / {balance.total_days} days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {balance.total_days - balance.used_days}
                            </p>
                            <p className="text-sm text-slate-500">days remaining</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <Calendar className="h-12 w-12 mb-2" />
                      <p>No leave balances found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PayrollPeriod, PayrollRecord, Employee } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  IndianRupee,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface PayrollRecordWithEmployee extends PayrollRecord {
  employee: { first_name: string; last_name: string; employee_id: string }
}

interface PayslipData {
  employee: Employee & { department: { name: string } | null }
  payroll: PayrollRecord
  period: { month: number; year: number }
}

export default function PayrollPage() {
  const { isRole } = useAuth()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null)
  const [records, setRecords] = useState<PayrollRecordWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [createPeriodDialogOpen, setCreatePeriodDialogOpen] = useState(false)
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false)
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPeriod, setNewPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })

  useEffect(() => {
    fetchPeriods()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      fetchRecords()
    }
  }, [selectedPeriod])

  const fetchPeriods = async () => {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      setPeriods(data || [])
      if (data && data.length > 0) {
        setSelectedPeriod(data[0])
      }
    }
    setLoading(false)
  }

  const fetchRecords = async () => {
    if (!selectedPeriod) return
    const { data } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employee:employees(first_name, last_name, employee_id)
      `)
      .eq('payroll_period_id', selectedPeriod.id)

    setRecords(data || [])
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
    setEmployees(data || [])
  }

  const handleCreatePeriod = async () => {
    const startDate = new Date(newPeriod.year, newPeriod.month - 1, 1)
    const endDate = new Date(newPeriod.year, newPeriod.month, 0)

    const { error } = await supabase.from('payroll_periods').insert({
      month: newPeriod.month,
      year: newPeriod.year,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Payroll period created' })
      setCreatePeriodDialogOpen(false)
      fetchPeriods()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPeriod) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        let imported = 0
        for (const row of jsonData as any[]) {
          const employeeCode = row['Employee ID'] || row['employee_id'] || row['EmployeeID']
          const employee = employees.find(
            (e) => e.employee_id === employeeCode || e.email === row['Email'] || e.email === row['email']
          )

          if (!employee) continue

          const basicSalary = parseFloat(row['Basic Salary'] || row['basic_salary'] || row['Basic'] || 0)
          const hra = parseFloat(row['HRA'] || row['hra'] || 0)
          const conveyance = parseFloat(row['Conveyance'] || row['conveyance'] || 0)
          const medical = parseFloat(row['Medical'] || row['medical'] || 0)
          const specialAllowance = parseFloat(row['Special Allowance'] || row['special_allowance'] || 0)
          const overtime = parseFloat(row['Overtime'] || row['overtime'] || 0)
          const bonus = parseFloat(row['Bonus'] || row['bonus'] || 0)
          const pfDeduction = parseFloat(row['PF'] || row['pf_deduction'] || 0)
          const esiDeduction = parseFloat(row['ESI'] || row['esi_deduction'] || 0)
          const professionalTax = parseFloat(row['Professional Tax'] || row['professional_tax'] || 0)
          const incomeTax = parseFloat(row['Income Tax'] || row['income_tax'] || 0)
          const otherDeductions = parseFloat(row['Other Deductions'] || row['other_deductions'] || 0)
          const daysWorked = parseInt(row['Days Worked'] || row['days_worked'] || 30)
          const lopDays = parseFloat(row['LOP Days'] || row['lop_days'] || 0)

          const grossSalary = basicSalary + hra + conveyance + medical + specialAllowance + overtime + bonus
          const netSalary = grossSalary - pfDeduction - esiDeduction - professionalTax - incomeTax - otherDeductions

          const existingRecord = records.find((r) => r.employee_id === employee.id)

          if (existingRecord) {
            await supabase
              .from('payroll_records')
              .update({
                basic_salary: basicSalary,
                hra,
                conveyance,
                medical,
                special_allowance: specialAllowance,
                overtime,
                bonus,
                pf_deduction: pfDeduction,
                esi_deduction: esiDeduction,
                professional_tax: professionalTax,
                income_tax: incomeTax,
                other_deductions: otherDeductions,
                gross_salary: grossSalary,
                net_salary: netSalary,
                days_worked: daysWorked,
                lop_days: lopDays,
              })
              .eq('id', existingRecord.id)
          } else {
            await supabase.from('payroll_records').insert({
              payroll_period_id: selectedPeriod.id,
              employee_id: employee.id,
              employee_code: employee.employee_id,
              basic_salary: basicSalary,
              hra,
              conveyance,
              medical,
              special_allowance: specialAllowance,
              overtime,
              bonus,
              pf_deduction: pfDeduction,
              esi_deduction: esiDeduction,
              professional_tax: professionalTax,
              income_tax: incomeTax,
              other_deductions: otherDeductions,
              gross_salary: grossSalary,
              net_salary: netSalary,
              days_worked: daysWorked,
              lop_days: lopDays,
            })
          }
          imported++
        }

        toast({ title: 'Success', description: `Imported ${imported} payroll records` })
        setUploadDialogOpen(false)
        fetchRecords()
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const generatePayslip = async (record: PayrollRecordWithEmployee) => {
    const { data: employeeData } = await supabase
      .from('employees')
      .select(`*, department:departments!employees_department_id_fkey(name)`)
      .eq('id', record.employee_id)
      .single()

    if (employeeData && selectedPeriod) {
      setPayslipData({
        employee: employeeData as any,
        payroll: record,
        period: { month: selectedPeriod.month, year: selectedPeriod.year },
      })
      setPayslipDialogOpen(true)
    }
  }

  const processPayroll = async () => {
    if (!selectedPeriod) return

    for (const record of records) {
      const payslipNumber = `PSL-${selectedPeriod.year}${String(selectedPeriod.month).padStart(2, '0')}-${record.employee.employee_id}`

      await supabase.from('payslips').insert({
        payroll_record_id: record.id,
        employee_id: record.employee_id,
        payslip_number: payslipNumber,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
      })
    }

    await supabase
      .from('payroll_periods')
      .update({
        is_processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', selectedPeriod.id)

    toast({ title: 'Success', description: 'Payroll processed and payslips generated' })
    fetchPeriods()
  }

  if (!isRole('hr', 'manager', 'ceo')) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <IndianRupee className="h-12 w-12 text-slate-400" />
          <p className="mt-2 text-slate-500">You do not have access to this page</p>
        </CardContent>
      </Card>
    )
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Payroll Management</h1>
          <p className="mt-1 text-slate-500">Upload and manage payroll data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCreatePeriodDialogOpen(true)}>
            <Clock className="mr-2 h-4 w-4" />
            New Period
          </Button>
          {selectedPeriod && (
            <>
              <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Excel
              </Button>
              {!selectedPeriod.is_processed && records.length > 0 && (
                <Button onClick={processPayroll}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Process Payroll
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Payroll Records</TabsTrigger>
          <TabsTrigger value="periods">Payroll Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            </div>
          ) : !selectedPeriod ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-slate-400" />
                <p className="mt-2 text-slate-500">No payroll period selected</p>
                <Button className="mt-4" onClick={() => setCreatePeriodDialogOpen(true)}>
                  Create Payroll Period
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {monthNames[selectedPeriod.month - 1]} {selectedPeriod.year}
                    </CardTitle>
                    <CardDescription>
                      {records.length} employees • {selectedPeriod.is_processed ? 'Processed' : 'Pending'}
                    </CardDescription>
                  </div>
                  <Badge variant={selectedPeriod.is_processed ? 'default' : 'secondary'}>
                    {selectedPeriod.is_processed ? 'Processed' : 'Pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Basic</TableHead>
                      <TableHead className="text-right">HRA</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No payroll records. Upload an Excel file to import data.
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.employee.first_name} {record.employee.last_name}
                              </p>
                              <p className="text-sm text-slate-500">{record.employee.employee_id}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            Rs. {record.basic_salary?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            Rs. {record.hra?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            Rs. {record.gross_salary?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            Rs. {((record.pf_deduction || 0) + (record.esi_deduction || 0) + (record.professional_tax || 0) + (record.income_tax || 0) + (record.other_deductions || 0)).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            Rs. {record.net_salary?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => generatePayslip(record)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="periods" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {periods.map((period) => (
              <Card
                key={period.id}
                className={`cursor-pointer transition-all ${
                  selectedPeriod?.id === period.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedPeriod(period)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {monthNames[period.month - 1]} {period.year}
                    </CardTitle>
                    <Badge variant={period.is_processed ? 'default' : 'secondary'}>
                      {period.is_processed ? 'Processed' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={createPeriodDialogOpen} onOpenChange={setCreatePeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
            <DialogDescription>Select the month and year for the new payroll period</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newPeriod.month}
                onChange={(e) => setNewPeriod({ ...newPeriod, month: parseInt(e.target.value) })}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={newPeriod.year}
                onChange={(e) => setNewPeriod({ ...newPeriod, year: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreatePeriodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod}>Create Period</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payroll Data</DialogTitle>
            <DialogDescription>
              Upload an Excel file with employee payroll data. Required columns: Employee ID, Basic Salary, HRA, Conveyance, Medical, Special Allowance, PF, ESI, Professional Tax, Income Tax
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
              <FileSpreadsheet className="h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">
                Drag and drop or click to upload
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                Select File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {payslipData && (
            <div className="space-y-4" id="payslip">
              <div className="rounded-lg border p-6">
                <div className="flex justify-between border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold">HRMS Pro</h2>
                    <p className="text-sm text-slate-500">Payslip for {monthNames[payslipData.period.month - 1]} {payslipData.period.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Payslip No.</p>
                    <p className="font-medium">PSL-{payslipData.period.year}{String(payslipData.period.month).padStart(2, '0')}-{payslipData.employee.employee_id}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Employee Name</p>
                    <p className="font-medium">{payslipData.employee.first_name} {payslipData.employee.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Employee ID</p>
                    <p className="font-medium">{payslipData.employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Department</p>
                    <p className="font-medium">{payslipData.employee.department?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Designation</p>
                    <p className="font-medium">{payslipData.employee.designation || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="mb-3 font-semibold text-green-700">Earnings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary</span>
                        <span>Rs. {payslipData.payroll.basic_salary?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HRA</span>
                        <span>Rs. {payslipData.payroll.hra?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conveyance</span>
                        <span>Rs. {payslipData.payroll.conveyance?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medical</span>
                        <span>Rs. {payslipData.payroll.medical?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special Allowance</span>
                        <span>Rs. {payslipData.payroll.special_allowance?.toLocaleString() || 0}</span>
                      </div>
                      {(payslipData.payroll.overtime || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Overtime</span>
                          <span>Rs. {payslipData.payroll.overtime?.toLocaleString() || 0}</span>
                        </div>
                      )}
                      {(payslipData.payroll.bonus || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Bonus</span>
                          <span>Rs. {payslipData.payroll.bonus?.toLocaleString() || 0}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Gross Salary</span>
                        <span>Rs. {payslipData.payroll.gross_salary?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-semibold text-red-700">Deductions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>PF</span>
                        <span>Rs. {payslipData.payroll.pf_deduction?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ESI</span>
                        <span>Rs. {payslipData.payroll.esi_deduction?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Tax</span>
                        <span>Rs. {payslipData.payroll.professional_tax?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Income Tax</span>
                        <span>Rs. {payslipData.payroll.income_tax?.toLocaleString() || 0}</span>
                      </div>
                      {(payslipData.payroll.other_deductions || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Other Deductions</span>
                          <span>Rs. {payslipData.payroll.other_deductions?.toLocaleString() || 0}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Total Deductions</span>
                        <span>Rs. {((payslipData.payroll.pf_deduction || 0) + (payslipData.payroll.esi_deduction || 0) + (payslipData.payroll.professional_tax || 0) + (payslipData.payroll.income_tax || 0) + (payslipData.payroll.other_deductions || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-lg bg-blue-50 p-4">
                  <span className="text-lg font-semibold text-blue-900">Net Salary</span>
                  <span className="text-2xl font-bold text-blue-600">
                    Rs. {payslipData.payroll.net_salary?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="mt-4 text-center text-xs text-slate-400">
                  <p>Days Worked: {payslipData.payroll.days_worked || 30} | LOP Days: {payslipData.payroll.lop_days || 0}</p>
                  <p className="mt-2">This is a computer-generated payslip and does not require signature.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const payslipContent = document.getElementById('payslip')
                    if (payslipContent) {
                      const printWindow = window.open('', '_blank')
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Payslip - ${payslipData.employee.employee_id}</title>
                              <style>
                                body { font-family: sans-serif; padding: 20px; }
                              </style>
                            </head>
                            <body>${payslipContent.innerHTML}</body>
                          </html>
                        `)
                        printWindow.document.close()
                        printWindow.print()
                      }
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Print/Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

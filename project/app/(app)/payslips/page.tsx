// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Payslip, PayrollRecord } from '@/lib/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { FileText, Download, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PayslipWithDetails extends Payslip {
  payroll_record: PayrollRecord
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function PayslipsPage() {
  const { employee } = useAuth()
  const [payslips, setPayslips] = useState<PayslipWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithDetails | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (employee) {
      fetchPayslips()
    }
  }, [employee])

  const fetchPayslips = async () => {
    if (!employee) return

    const { data, error } = await supabase
      .from('payslips')
      .select('*, payroll_record:payroll_records(*)')
      .eq('employee_id', employee.id)
      .order('generated_at', { ascending: false })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      setPayslips(data || [])
    }
    setLoading(false)
  }

  const viewPayslip = (payslip: PayslipWithDetails) => {
    setSelectedPayslip(payslip)
    setDialogOpen(true)
  }

  const printPayslip = () => {
    const content = document.getElementById('payslip-content')
    if (content) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Payslip - ${selectedPayslip?.payslip_number}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; }
              </style>
            </head>
            <body>${content.innerHTML}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">My Payslips</h1>
        <p className="mt-1 text-slate-500">View and download your payslips</p>
      </div>

      {payslips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-400" />
            <p className="mt-2 text-slate-500">No payslips available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {payslips.map((payslip) => (
            <Card key={payslip.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {monthNames[payslip.month - 1]} {payslip.year}
                    </CardTitle>
                    <CardDescription>{payslip.payslip_number}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    Rs. {payslip.payroll_record.net_salary?.toLocaleString() || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-slate-500 mb-4">
                  <span>Gross: Rs. {payslip.payroll_record.gross_salary?.toLocaleString() || 0}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => viewPayslip(payslip)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
          </DialogHeader>
          {selectedPayslip && employee && (
            <div id="payslip-content">
              <div className="rounded-lg border p-6">
                <div className="flex justify-between border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold">HRMS Pro</h2>
                    <p className="text-sm text-slate-500">Payslip for {monthNames[selectedPayslip.month - 1]} {selectedPayslip.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Payslip No.</p>
                    <p className="font-medium">{selectedPayslip.payslip_number}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Employee Name</p>
                    <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Employee ID</p>
                    <p className="font-medium">{employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Designation</p>
                    <p className="font-medium">{employee.designation || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="mb-3 font-semibold text-green-700">Earnings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary</span>
                        <span>Rs. {selectedPayslip.payroll_record.basic_salary?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HRA</span>
                        <span>Rs. {selectedPayslip.payroll_record.hra?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conveyance</span>
                        <span>Rs. {selectedPayslip.payroll_record.conveyance?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medical</span>
                        <span>Rs. {selectedPayslip.payroll_record.medical?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special Allowance</span>
                        <span>Rs. {selectedPayslip.payroll_record.special_allowance?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Gross Salary</span>
                        <span>Rs. {selectedPayslip.payroll_record.gross_salary?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-semibold text-red-700">Deductions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>PF</span>
                        <span>Rs. {selectedPayslip.payroll_record.pf_deduction?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ESI</span>
                        <span>Rs. {selectedPayslip.payroll_record.esi_deduction?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Tax</span>
                        <span>Rs. {selectedPayslip.payroll_record.professional_tax?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Income Tax</span>
                        <span>Rs. {selectedPayslip.payroll_record.income_tax?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Total Deductions</span>
                        <span>Rs. {((selectedPayslip.payroll_record.pf_deduction || 0) + (selectedPayslip.payroll_record.esi_deduction || 0) + (selectedPayslip.payroll_record.professional_tax || 0) + (selectedPayslip.payroll_record.income_tax || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-lg bg-blue-50 p-4">
                  <span className="text-lg font-semibold text-blue-900">Net Salary</span>
                  <span className="text-2xl font-bold text-blue-600">
                    Rs. {selectedPayslip.payroll_record.net_salary?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="mt-4 text-center text-xs text-slate-400">
                  <p>Days Worked: {selectedPayslip.payroll_record.days_worked || 30} | LOP Days: {selectedPayslip.payroll_record.lop_days || 0}</p>
                  <p className="mt-2">This is a computer-generated payslip and does not require signature.</p>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={printPayslip}>
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

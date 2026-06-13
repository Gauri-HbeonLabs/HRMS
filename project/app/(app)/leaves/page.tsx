// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Leave, LeaveType, Employee } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface LeaveWithDetails extends Leave {
  employee: { first_name: string; last_name: string; employee_id: string }
  leave_type: { name: string }
  approver: { first_name: string; last_name: string } | null
}

export default function LeavesPage() {
  const { employee, isRole } = useAuth()
  const [myLeaves, setMyLeaves] = useState<LeaveWithDetails[]>([])
  const [pendingLeaves, setPendingLeaves] = useState<LeaveWithDetails[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveWithDetails | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  useEffect(() => {
    fetchLeaves()
    fetchLeaveTypes()
  }, [employee])

  const fetchLeaves = async () => {
    if (!employee) return
    setLoading(true)

    const { data: myData } = await supabase
      .from('leaves')
      .select(`
        *,
        employee:employees!leaves_employee_id_fkey(first_name, last_name, employee_id),
        leave_type:leave_types(name),
        approver:employees!leaves_approved_by_fkey(first_name, last_name)
      `)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })

    setMyLeaves(myData || [])

    if (isRole('hr', 'manager', 'ceo')) {
      const { data: pendingData } = await supabase
        .from('leaves')
        .select(`
          *,
          employee:employees!leaves_employee_id_fkey(first_name, last_name, employee_id),
          leave_type:leave_types(name),
          approver:employees!leaves_approved_by_fkey(first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      setPendingLeaves(pendingData || [])
    }

    setLoading(false)
  }

  const fetchLeaveTypes = async () => {
    const { data } = await supabase.from('leave_types').select('*')
    setLeaveTypes(data || [])
  }

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    const daysCount = calculateDays(formData.start_date, formData.end_date)

    const { error } = await supabase.from('leaves').insert({
      employee_id: employee.id,
      leave_type_id: formData.leave_type_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_count: daysCount,
      reason: formData.reason || null,
      status: 'pending',
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Leave request submitted successfully' })
      fetchLeaves()
      setDialogOpen(false)
      resetForm()
    }
  }

  const handleApproval = async (approved: boolean) => {
    if (!selectedLeave || !employee) return

    const { error } = await supabase
      .from('leaves')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_by: employee.id,
        approved_at: new Date().toISOString(),
        rejection_reason: !approved ? rejectionReason : null,
      })
      .eq('id', selectedLeave.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: `Leave ${approved ? 'approved' : 'rejected'} successfully` })
      fetchLeaves()
      setApprovalDialogOpen(false)
      setSelectedLeave(null)
      setRejectionReason('')
    }
  }

  const resetForm = () => {
    setFormData({
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>
      default:
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Leave Management</h1>
          <p className="mt-1 text-slate-500">Apply and manage leave requests</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      <Tabs defaultValue="my-leaves">
        <TabsList>
          <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
          {isRole('hr', 'manager', 'ceo') && (
            <TabsTrigger value="pending">
              Pending Approvals
              {pendingLeaves.length > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {pendingLeaves.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-leaves" className="mt-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            </div>
          ) : myLeaves.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarDays className="h-12 w-12 text-slate-400" />
                <p className="mt-2 text-slate-500">No leave requests found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myLeaves.map((leave) => (
                <Card key={leave.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <CalendarDays className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{leave.leave_type.name}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                          <span className="ml-2">({leave.days_count} days)</span>
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-slate-400">{leave.reason}</p>
                        )}
                        {leave.status === 'rejected' && leave.rejection_reason && (
                          <p className="text-sm text-red-500">Reason: {leave.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {leave.approver && leave.status !== 'pending' && (
                        <p className="text-sm text-slate-500">
                          By {leave.approver.first_name} {leave.approver.last_name}
                        </p>
                      )}
                      {getStatusBadge(leave.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isRole('hr', 'manager', 'ceo') && (
          <TabsContent value="pending" className="mt-4">
            {pendingLeaves.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-400" />
                  <p className="mt-2 text-slate-500">No pending leave requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <Card key={leave.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {leave.employee.first_name} {leave.employee.last_name}
                            <span className="ml-2 text-sm text-slate-400">({leave.employee.employee_id})</span>
                          </p>
                          <p className="text-sm text-slate-500">
                            {leave.leave_type.name} • {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                            <span className="ml-2">({leave.days_count} days)</span>
                          </p>
                          {leave.reason && (
                            <p className="text-sm text-slate-400">"{leave.reason}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={() => {
                            setSelectedLeave(leave)
                            handleApproval(true)
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedLeave(leave)
                            setApprovalDialogOpen(true)
                          }}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Submit a new leave request</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leave_type">Leave Type</Label>
              <Select
                value={formData.leave_type_id}
                onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApproval(false)}
                disabled={!rejectionReason}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

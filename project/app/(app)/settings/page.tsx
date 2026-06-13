// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Shield,
  Lock,
  Building2,
  CalendarDays,
  Clock,
  Bell,
  Database,
  Save,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  Globe,
  Mail,
  FileText,
  Users,
} from 'lucide-react'

export default function SettingsPage() {
  const { employee, isRole } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Password change
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Company settings
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    company_logo_url: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    email: '',
    website: '',
    fiscal_year_start: 'April',
    currency: 'INR',
    date_format: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
  })

  // Leave types
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [editingLeaveType, setEditingLeaveType] = useState<any>(null)
  const [deleteLeaveTarget, setDeleteLeaveTarget] = useState<any>(null)
  const [leaveForm, setLeaveForm] = useState({ name: '', days_allowed: '', description: '', is_paid: true })

  // Holidays
  const [holidays, setHolidays] = useState<any[]>([])
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<any>(null)
  const [deleteHolidayTarget, setDeleteHolidayTarget] = useState<any>(null)
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', is_optional: false })

  // Attendance settings
  const [attendanceSettings, setAttendanceSettings] = useState({
    work_start_time: '09:00',
    work_end_time: '18:00',
    late_threshold_min: '15',
    half_day_hours: '4',
    overtime_threshold_hours: '9',
  })

  // Notification preferences
  const [notifications, setNotifications] = useState({
    leave_request_email: true,
    attendance_reminder: true,
    payroll_notification: true,
    birthday_reminder: true,
    work_anniversary: true,
    new_employee_welcome: true,
  })

  const canManageAll = isRole('hr', 'ceo')

  useEffect(() => {
    fetchCompanySettings()
    fetchLeaveTypes()
    fetchHolidays()
    fetchAttendanceSettings()
    fetchNotifications()
  }, [])

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('setting_key', 'company_info')
      .maybeSingle()

    if (data?.setting_value) {
      setCompanyForm(prev => ({ ...prev, ...data.setting_value }))
    }
  }

  const fetchLeaveTypes = async () => {
    const { data } = await supabase.from('leave_types').select('*').order('name')
    setLeaveTypes(data || [])
  }

  const fetchHolidays = async () => {
    const { data } = await supabase.from('holidays').select('*').order('date')
    setHolidays(data || [])
  }

  const fetchAttendanceSettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('setting_key', 'attendance_config')
      .maybeSingle()

    if (data?.setting_value) {
      setAttendanceSettings(prev => ({ ...prev, ...data.setting_value }))
    }
  }

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('setting_key', 'notifications')
      .maybeSingle()

    if (data?.setting_value) {
      setNotifications(prev => ({ ...prev, ...data.setting_value }))
    }
  }

  // ─── PASSWORD CHANGE ───
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' })
      return
    }
    if (passwordForm.new.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Password updated successfully' })
      setPasswordForm({ current: '', new: '', confirm: '' })
    }
    setPasswordLoading(false)
  }

  // ─── COMPANY SETTINGS ───
  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        setting_key: 'company_info',
        setting_value: companyForm,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Company settings saved' })
    }
    setLoading(false)
  }

  // ─── LEAVE TYPES ───
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const leaveData = {
      name: leaveForm.name,
      days_allowed: parseInt(leaveForm.days_allowed),
      description: leaveForm.description || null,
      is_paid: leaveForm.is_paid,
    }

    if (editingLeaveType) {
      const { error } = await supabase.from('leave_types').update(leaveData).eq('id', editingLeaveType.id)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else toast({ title: 'Success', description: 'Leave type updated' })
    } else {
      const { error } = await supabase.from('leave_types').insert(leaveData)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else toast({ title: 'Success', description: 'Leave type created' })
    }

    fetchLeaveTypes()
    setLeaveDialogOpen(false)
    setEditingLeaveType(null)
    setLeaveForm({ name: '', days_allowed: '', description: '', is_paid: true })
    setLoading(false)
  }

  const handleDeleteLeaveType = async () => {
    if (!deleteLeaveTarget) return
    const { error } = await supabase.from('leave_types').delete().eq('id', deleteLeaveTarget.id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else toast({ title: 'Success', description: 'Leave type deleted' })
    fetchLeaveTypes()
    setDeleteLeaveTarget(null)
  }

  const openEditLeaveType = (lt: any) => {
    setEditingLeaveType(lt)
    setLeaveForm({ name: lt.name, days_allowed: String(lt.days_allowed), description: lt.description || '', is_paid: lt.is_paid })
    setLeaveDialogOpen(true)
  }

  // ─── HOLIDAYS ───
  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const holidayData = {
      name: holidayForm.name,
      date: holidayForm.date,
      is_optional: holidayForm.is_optional,
    }

    if (editingHoliday) {
      const { error } = await supabase.from('holidays').update(holidayData).eq('id', editingHoliday.id)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else toast({ title: 'Success', description: 'Holiday updated' })
    } else {
      const { error } = await supabase.from('holidays').insert(holidayData)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else toast({ title: 'Success', description: 'Holiday added' })
    }

    fetchHolidays()
    setHolidayDialogOpen(false)
    setEditingHoliday(null)
    setHolidayForm({ name: '', date: '', is_optional: false })
    setLoading(false)
  }

  const handleDeleteHoliday = async () => {
    if (!deleteHolidayTarget) return
    const { error } = await supabase.from('holidays').delete().eq('id', deleteHolidayTarget.id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else toast({ title: 'Success', description: 'Holiday deleted' })
    fetchHolidays()
    setDeleteHolidayTarget(null)
  }

  const openEditHoliday = (h: any) => {
    setEditingHoliday(h)
    setHolidayForm({ name: h.name, date: h.date, is_optional: h.is_optional })
    setHolidayDialogOpen(true)
  }

  // ─── ATTENDANCE SETTINGS ───
  const handleAttendanceSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        setting_key: 'attendance_config',
        setting_value: attendanceSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Attendance settings saved' })
    }
    setLoading(false)
  }

  // ─── NOTIFICATIONS ───
  const handleNotificationSave = async () => {
    setLoading(true)

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        setting_key: 'notifications',
        setting_value: notifications,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Notification preferences saved' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500">Manage system configuration and preferences</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="account" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Account
          </TabsTrigger>
          {canManageAll && (
            <>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </TabsTrigger>
              <TabsTrigger value="leave-types" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Leave Types
              </TabsTrigger>
              <TabsTrigger value="holidays" className="gap-2">
                <Globe className="h-4 w-4" />
                Holidays
              </TabsTrigger>
              <TabsTrigger value="attendance-config" className="gap-2">
                <Clock className="h-4 w-4" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ─── ACCOUNT / CHANGE PASSWORD ─── */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{employee?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Employee ID</p>
                  <p className="font-medium">{employee?.employee_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Role</p>
                  <Badge className="capitalize">{employee?.role}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date of Joining</p>
                  <p className="font-medium">{employee?.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── COMPANY SETTINGS ─── */}
        {canManageAll && (
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>Configure your organization details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCompanySave} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        value={companyForm.company_name}
                        onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_email">Company Email</Label>
                      <Input
                        id="company_email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                        placeholder="hr@acme.com"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company_phone">Phone</Label>
                      <Input
                        id="company_phone"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_website">Website</Label>
                      <Input
                        id="company_website"
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                        placeholder="https://acme.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_address">Address</Label>
                    <Textarea
                      id="company_address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_city">City</Label>
                      <Input id="company_city" value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_state">State</Label>
                      <Input id="company_state" value={companyForm.state} onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_pincode">Pincode</Label>
                      <Input id="company_pincode" value={companyForm.pincode} onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_country">Country</Label>
                      <Input id="company_country" value={companyForm.country} onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })} />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="fiscal_year">Fiscal Year Start</Label>
                      <Select value={companyForm.fiscal_year_start} onValueChange={(v) => setCompanyForm({ ...companyForm, fiscal_year_start: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={companyForm.currency} onValueChange={(v) => setCompanyForm({ ...companyForm, currency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                          <SelectItem value="USD">USD (US Dollar)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_format">Date Format</Label>
                      <Select value={companyForm.date_format} onValueChange={(v) => setCompanyForm({ ...companyForm, date_format: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? 'Saving...' : 'Save Company Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─── LEAVE TYPES ─── */}
        {canManageAll && (
          <TabsContent value="leave-types">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Leave Types
                    </CardTitle>
                    <CardDescription>Configure leave categories and allowances</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingLeaveType(null); setLeaveForm({ name: '', days_allowed: '', description: '', is_paid: true }); setLeaveDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Leave Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead className="text-center">Days Allowed</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">No leave types configured</TableCell>
                      </TableRow>
                    ) : (
                      leaveTypes.map((lt) => (
                        <TableRow key={lt.id}>
                          <TableCell className="font-medium">{lt.name}</TableCell>
                          <TableCell className="text-center">{lt.days_allowed}</TableCell>
                          <TableCell className="text-slate-500">{lt.description || '-'}</TableCell>
                          <TableCell className="text-center">
                            {lt.is_paid ? <Badge className="bg-green-500">Paid</Badge> : <Badge variant="secondary">Unpaid</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditLeaveType(lt)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteLeaveTarget(lt)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Leave Type Dialog */}
            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingLeaveType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
                  <DialogDescription>{editingLeaveType ? 'Update leave type details' : 'Create a new leave category'}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="leave_name">Name</Label>
                    <Input id="leave_name" value={leaveForm.name} onChange={(e) => setLeaveForm({ ...leaveForm, name: e.target.value })} placeholder="e.g. Casual Leave" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leave_days">Days Allowed / Year</Label>
                    <Input id="leave_days" type="number" value={leaveForm.days_allowed} onChange={(e) => setLeaveForm({ ...leaveForm, days_allowed: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leave_desc">Description</Label>
                    <Textarea id="leave_desc" value={leaveForm.description} onChange={(e) => setLeaveForm({ ...leaveForm, description: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={leaveForm.is_paid} onCheckedChange={(checked) => setLeaveForm({ ...leaveForm, is_paid: checked })} />
                    <Label>Paid Leave</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete Leave Type */}
            <AlertDialog open={!!deleteLeaveTarget} onOpenChange={(open) => !open && setDeleteLeaveTarget(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to delete &quot;{deleteLeaveTarget?.name}&quot;? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteLeaveType}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        )}

        {/* ─── HOLIDAYS ─── */}
        {canManageAll && (
          <TabsContent value="holidays">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Public Holidays
                    </CardTitle>
                    <CardDescription>Manage company holiday calendar</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingHoliday(null); setHolidayForm({ name: '', date: '', is_optional: false }); setHolidayDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holiday</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">No holidays configured</TableCell>
                      </TableRow>
                    ) : (
                      holidays.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.name}</TableCell>
                          <TableCell>{new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</TableCell>
                          <TableCell className="text-center">
                            {h.is_optional ? <Badge variant="outline">Optional</Badge> : <Badge className="bg-blue-500">Public</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditHoliday(h)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteHolidayTarget(h)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Holiday Dialog */}
            <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
                  <DialogDescription>{editingHoliday ? 'Update holiday details' : 'Add a new holiday to the calendar'}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleHolidaySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="holiday_name">Holiday Name</Label>
                    <Input id="holiday_name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g. Diwali" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday_date">Date</Label>
                    <Input id="holiday_date" type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} required />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={holidayForm.is_optional} onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, is_optional: checked })} />
                    <Label>Optional Holiday</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setHolidayDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete Holiday */}
            <AlertDialog open={!!deleteHolidayTarget} onOpenChange={(open) => !open && setDeleteHolidayTarget(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to delete &quot;{deleteHolidayTarget?.name}&quot;?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteHoliday}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        )}

        {/* ─── ATTENDANCE CONFIG ─── */}
        {canManageAll && (
          <TabsContent value="attendance-config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Attendance Configuration
                </CardTitle>
                <CardDescription>Set work hours, late thresholds, and overtime rules</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAttendanceSave} className="max-w-lg space-y-4">
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="work_start">Work Start Time</Label>
                      <Input id="work_start" type="time" value={attendanceSettings.work_start_time} onChange={(e) => setAttendanceSettings({ ...attendanceSettings, work_start_time: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_end">Work End Time</Label>
                      <Input id="work_end" type="time" value={attendanceSettings.work_end_time} onChange={(e) => setAttendanceSettings({ ...attendanceSettings, work_end_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="late_threshold">Late Threshold (minutes)</Label>
                      <Input id="late_threshold" type="number" value={attendanceSettings.late_threshold_min} onChange={(e) => setAttendanceSettings({ ...attendanceSettings, late_threshold_min: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="half_day">Half Day Hours</Label>
                      <Input id="half_day" type="number" value={attendanceSettings.half_day_hours} onChange={(e) => setAttendanceSettings({ ...attendanceSettings, half_day_hours: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overtime">Overtime Threshold (hours)</Label>
                    <Input id="overtime" type="number" value={attendanceSettings.overtime_threshold_hours} onChange={(e) => setAttendanceSettings({ ...attendanceSettings, overtime_threshold_hours: e.target.value })} />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? 'Saving...' : 'Save Attendance Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─── NOTIFICATIONS ─── */}
        {canManageAll && (
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Configure which notifications are sent to employees</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium">Leave Request Emails</p>
                        <p className="text-sm text-slate-500">Notify managers when employees request leave</p>
                      </div>
                    </div>
                    <Switch checked={notifications.leave_request_email} onCheckedChange={(checked) => setNotifications({ ...notifications, leave_request_email: checked })} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium">Attendance Reminder</p>
                        <p className="text-sm text-slate-500">Remind employees to check in on time</p>
                      </div>
                    </div>
                    <Switch checked={notifications.attendance_reminder} onCheckedChange={(checked) => setNotifications({ ...notifications, attendance_reminder: checked })} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium">Payroll Notification</p>
                        <p className="text-sm text-slate-500">Notify employees when payroll is processed</p>
                      </div>
                    </div>
                    <Switch checked={notifications.payroll_notification} onCheckedChange={(checked) => setNotifications({ ...notifications, payroll_notification: checked })} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium">Birthday Reminder</p>
                        <p className="text-sm text-slate-500">Notify team about upcoming birthdays</p>
                      </div>
                    </div>
                    <Switch checked={notifications.birthday_reminder} onCheckedChange={(checked) => setNotifications({ ...notifications, birthday_reminder: checked })} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium">Work Anniversary</p>
                        <p className="text-sm text-slate-500">Celebrate employee work anniversaries</p>
                      </div>
                    </div>
                    <Switch checked={notifications.work_anniversary} onCheckedChange={(checked) => setNotifications({ ...notifications, work_anniversary: checked })} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium">New Employee Welcome</p>
                        <p className="text-sm text-slate-500">Send welcome email to new hires</p>
                      </div>
                    </div>
                    <Switch checked={notifications.new_employee_welcome} onCheckedChange={(checked) => setNotifications({ ...notifications, new_employee_welcome: checked })} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNotificationSave} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

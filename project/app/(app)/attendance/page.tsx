// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  Calendar,
  User,
  Users,
  BarChart3,
  Search,
  Download,
  Filter,
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  work_hours: number | null
  status: string
  notes: string | null
  employee?: {
    first_name: string
    last_name: string
    employee_id: string
    designation: string
    department?: { name: string } | null
  }
}

export default function AttendancePage() {
  const { employee, isRole } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([])
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(false)
  const { toast } = useToast()

  // Team attendance filters
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split('T')[0])
  const [teamSearch, setTeamSearch] = useState('')
  const [teamDepartment, setTeamDepartment] = useState('all')
  const [departments, setDepartments] = useState<any[]>([])

  // Report filters
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)

  const canViewTeam = isRole('hr', 'manager', 'ceo')

  useEffect(() => {
    if (employee) {
      fetchMyAttendance()
      fetchDepartments()
    }
  }, [employee])

  const fetchMyAttendance = async () => {
    if (!employee) return
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .maybeSingle()

    setTodayAttendance(todayData || null)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const { data: monthlyData } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .order('date', { ascending: false })

    setMonthlyAttendance(monthlyData || [])
    setLoading(false)
  }

  const fetchTeamAttendance = async () => {
    if (!employee) return
    setTeamLoading(true)

    let query = supabase
      .from('attendance')
      .select(`
        *,
        employee:employees(
          first_name,
          last_name,
          employee_id,
          designation,
          department:departments!employees_department_id_fkey(name)
        )
      `)
      .eq('date', teamDate)
      .order('check_in', { ascending: true })

    const { data, error } = await query

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      setTeamAttendance((data as any[]) || [])
    }

    // Also fetch employees for "not checked in" display
    const { data: empData } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_id, designation, is_active, department:departments!employees_department_id_fkey(id, name)')
      .eq('is_active', true)

    setEmployees(empData || [])
    setTeamLoading(false)
  }

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*')
    setDepartments(data || [])
  }

  const fetchReport = async () => {
    setReportLoading(true)

    const startDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`
    const endDate = new Date(reportYear, reportMonth, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        employee_id,
        status,
        work_hours,
        date,
        employee:employees(
          first_name,
          last_name,
          employee_id,
          designation,
          department:departments!employees_department_id_fkey(name)
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      // Aggregate per employee
      const empMap = new Map()
      for (const row of (data as any[]) || []) {
        const eid = row.employee_id
        if (!empMap.has(eid)) {
          empMap.set(eid, {
            employee_id: eid,
            employee: row.employee,
            present: 0,
            absent: 0,
            half_day: 0,
            totalHours: 0,
            days: 0,
          })
        }
        const entry = empMap.get(eid)
        entry.days++
        if (row.status === 'present') entry.present++
        else if (row.status === 'absent') entry.absent++
        else if (row.status === 'half_day') entry.half_day++
        entry.totalHours += row.work_hours || 0
      }
      setReportData(Array.from(empMap.values()))
    }
    setReportLoading(false)
  }

  const handleCheckIn = async () => {
    if (!employee) return

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toTimeString().split(' ')[0]

    const { error } = await supabase.from('attendance').insert({
      employee_id: employee.id,
      date: today,
      check_in: now,
      status: 'present',
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Checked in successfully' })
      fetchMyAttendance()
    }
  }

  const handleCheckOut = async () => {
    if (!todayAttendance || !employee) return

    const now = new Date().toTimeString().split(' ')[0]
    const checkInTime = new Date(`2000-01-01T${todayAttendance.check_in}`)
    const checkOutTime = new Date(`2000-01-01T${now}`)
    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

    const { error } = await supabase
      .from('attendance')
      .update({
        check_out: now,
        work_hours: Math.round(workHours * 100) / 100,
      })
      .eq('id', todayAttendance.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Checked out successfully' })
      fetchMyAttendance()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>
      case 'half_day':
        return <Badge variant="secondary">Half Day</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Present'
      case 'absent': return 'Absent'
      case 'half_day': return 'Half Day'
      return status
    }
  }

  // Employees who haven't checked in today
  const checkedInIds = new Set(teamAttendance.map(a => a.employee_id))
  const notCheckedIn = employees.filter(e => !checkedInIds.has(e.id))

  // Team attendance filtered
  const filteredTeam = teamAttendance.filter(a => {
    const query = teamSearch.toLowerCase()
    const nameMatch = !query ||
      a.employee?.first_name?.toLowerCase().includes(query) ||
      a.employee?.last_name?.toLowerCase().includes(query) ||
      a.employee?.employee_id?.toLowerCase().includes(query)
    const deptMatch = teamDepartment === 'all' ||
      (a.employee?.department as any)?.name === teamDepartment
    return nameMatch && deptMatch
  })

  const filteredNotCheckedIn = notCheckedIn.filter(e => {
    const query = teamSearch.toLowerCase()
    const nameMatch = !query ||
      e.first_name?.toLowerCase().includes(query) ||
      e.last_name?.toLowerCase().includes(query) ||
      e.employee_id?.toLowerCase().includes(query)
    const deptMatch = teamDepartment === 'all' ||
      (e.department as any)?.name === teamDepartment
    return nameMatch && deptMatch
  })

  const presentDays = monthlyAttendance.filter(a => a.status === 'present').length
  const totalWorkHours = monthlyAttendance.reduce((acc, a) => acc + (a.work_hours || 0), 0)

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const exportCSV = () => {
    const header = 'Employee ID,Name,Department,Present,Absent,Half Days,Total Hours,Attendance %\n'
    const rows = reportData.map(r => {
      const name = `${r.employee?.first_name || ''} ${r.employee?.last_name || ''}`
      const dept = (r.employee?.department as any)?.name || 'N/A'
      const totalWorkingDays = r.present + r.absent + r.half_day
      const pct = totalWorkingDays > 0 ? Math.round((r.present + r.half_day * 0.5) / totalWorkingDays * 100) : 0
      return `${r.employee?.employee_id},${name},${dept},${r.present},${r.absent},${r.half_day},${r.totalHours.toFixed(1)},${pct}%`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${monthNames[reportMonth - 1]}_${reportYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="mt-1 text-slate-500">Track and manage attendance</p>
      </div>

      <Tabs defaultValue="my-attendance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-attendance" className="gap-2">
            <User className="h-4 w-4" />
            My Attendance
          </TabsTrigger>
          {canViewTeam && (
            <TabsTrigger value="team-attendance" className="gap-2">
              <Users className="h-4 w-4" />
              Team Attendance
            </TabsTrigger>
          )}
          {canViewTeam && (
            <TabsTrigger value="attendance-reports" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Attendance Reports
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── MY ATTENDANCE ─── */}
        <TabsContent value="my-attendance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {todayAttendance ? (
                    <>
                      <div>
                        <p className="text-2xl font-bold">
                          {todayAttendance.check_in
                            ? `In at ${todayAttendance.check_in}`
                            : 'Not Checked In'}
                        </p>
                        {todayAttendance.check_out && (
                          <p className="text-sm text-slate-500">Out at {todayAttendance.check_out}</p>
                        )}
                      </div>
                      {getStatusBadge(todayAttendance.status)}
                    </>
                  ) : (
                    <p className="text-slate-500">Not marked yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{presentDays} days</p>
                <p className="text-sm text-slate-500">Present this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalWorkHours.toFixed(1)}h</p>
                <p className="text-sm text-slate-500">Worked this month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Mark Attendance
              </CardTitle>
              <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  onClick={handleCheckIn}
                  disabled={!!todayAttendance?.check_in}
                  className="flex-1"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Check In
                </Button>
                <Button
                  onClick={handleCheckOut}
                  disabled={!todayAttendance?.check_in || !!todayAttendance?.check_out}
                  variant="outline"
                  className="flex-1"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Check Out
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance History
              </CardTitle>
              <CardDescription>Your attendance for this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyAttendance.length === 0 ? (
                  <p className="text-slate-500">No attendance records this month</p>
                ) : (
                  monthlyAttendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-sm text-slate-500">
                            {record.check_in ? `In: ${record.check_in}` : '-'}
                            {record.check_out ? ` | Out: ${record.check_out}` : ''}
                            {record.work_hours && ` | ${record.work_hours}h`}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TEAM ATTENDANCE ─── */}
        {canViewTeam && (
          <TabsContent value="team-attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Attendance
                </CardTitle>
                <CardDescription>View all employee attendance for a specific date</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Date</label>
                    <Input
                      type="date"
                      value={teamDate}
                      onChange={(e) => setTeamDate(e.target.value)}
                      className="w-44"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Department</label>
                    <Select value={teamDepartment} onValueChange={setTeamDepartment}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative space-y-2">
                    <label className="text-sm font-medium text-slate-700">Search</label>
                    <Search className="absolute left-3 bottom-[10px] h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Name or Employee ID..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="pl-9 w-56"
                    />
                  </div>
                  <Button onClick={fetchTeamAttendance} disabled={teamLoading}>
                    <Filter className="mr-2 h-4 w-4" />
                    Load
                  </Button>
                </div>

                {/* Summary */}
                <div className="grid gap-3 md:grid-cols-3 mb-6">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-green-700">Checked In</p>
                      <p className="text-2xl font-bold text-green-800">{filteredTeam.filter(a => a.status === 'present').length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-amber-700">Not Checked In</p>
                      <p className="text-2xl font-bold text-amber-800">{filteredNotCheckedIn.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-blue-700">Total Active</p>
                      <p className="text-2xl font-bold text-blue-800">{filteredTeam.length + filteredNotCheckedIn.length}</p>
                    </CardContent>
                  </Card>
                </div>

                {teamLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Checked-in table */}
                    {filteredTeam.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Check In</TableHead>
                            <TableHead>Check Out</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTeam.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.employee?.employee_id || '-'}</TableCell>
                              <TableCell>{record.employee?.first_name} {record.employee?.last_name}</TableCell>
                              <TableCell>{(record.employee?.department as any)?.name || '-'}</TableCell>
                              <TableCell>{record.check_in || '-'}</TableCell>
                              <TableCell>{record.check_out || '-'}</TableCell>
                              <TableCell>{record.work_hours ? `${record.work_hours}h` : '-'}</TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {/* Not checked in */}
                    {filteredNotCheckedIn.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-slate-600 mb-2">Not Checked In</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Designation</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredNotCheckedIn.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell className="font-medium">{emp.employee_id}</TableCell>
                                <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                                <TableCell>{(emp.department as any)?.name || '-'}</TableCell>
                                <TableCell>{emp.designation || '-'}</TableCell>
                                <TableCell><Badge variant="outline" className="text-slate-500">Not Marked</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {filteredTeam.length === 0 && filteredNotCheckedIn.length === 0 && (
                      <p className="text-center text-slate-500 py-8">Click "Load" to fetch attendance data for the selected date</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ─── ATTENDANCE REPORTS ─── */}
        {canViewTeam && (
          <TabsContent value="attendance-reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Attendance Reports
                </CardTitle>
                <CardDescription>Monthly attendance summary for all employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Month</label>
                    <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(Number(v))}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Year</label>
                    <Input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-28"
                    />
                  </div>
                  <Button onClick={fetchReport} disabled={reportLoading}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                  {reportData.length > 0 && (
                    <Button variant="outline" onClick={exportCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {reportLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                  </div>
                ) : reportData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Half Days</TableHead>
                        <TableHead className="text-center">Total Hours</TableHead>
                        <TableHead className="text-center">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row) => {
                        const totalDays = row.present + row.absent + row.half_day
                        const pct = totalDays > 0 ? Math.round((row.present + row.half_day * 0.5) / totalDays * 100) : 0
                        return (
                          <TableRow key={row.employee_id}>
                            <TableCell className="font-medium">{row.employee?.employee_id || '-'}</TableCell>
                            <TableCell>{row.employee?.first_name} {row.employee?.last_name}</TableCell>
                            <TableCell>{(row.employee?.department as any)?.name || '-'}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-500">{row.present}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive">{row.absent}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{row.half_day}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{row.totalHours.toFixed(1)}h</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={pct >= 75 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'}>
                                {pct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-slate-500 py-8">Select month and year, then click "Generate" to view the report</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

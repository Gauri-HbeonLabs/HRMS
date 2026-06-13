// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Users,
  FolderKanban,
  CalendarDays,
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  UserCheck,
  UserX,
  Briefcase,
  Cake,
  Gift,
  PartyPopper,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function DashboardPage() {
  const { employee, isRole } = useAuth()
  const [loading, setLoading] = useState(true)

  // Admin stats
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [activeEmployees, setActiveEmployees] = useState(0)
  const [inactiveEmployees, setInactiveEmployees] = useState(0)
  const [activeProjects, setActiveProjects] = useState(0)
  const [pendingLeaves, setPendingLeaves] = useState(0)
  const [payrollProcessed, setPayrollProcessed] = useState(false)
  const [recentLeaves, setRecentLeaves] = useState<any[]>([])

  // Charts
  const [deptDistribution, setDeptDistribution] = useState<any[]>([])
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([])
  const [leaveTypeBreakdown, setLeaveTypeBreakdown] = useState<any[]>([])
  const [roleDistribution, setRoleDistribution] = useState<any[]>([])

  // Employee personal
  const [leaveBalances, setLeaveBalances] = useState<any[]>([])
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [myRecentLeaves, setMyRecentLeaves] = useState<any[]>([])
  const [monthlyAttendanceSummary, setMonthlyAttendanceSummary] = useState({ present: 0, absent: 0, halfDay: 0, totalHours: 0 })

  // Birthday & Anniversary
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([])
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<any[]>([])
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([])

  const canViewStats = isRole('hr', 'manager', 'ceo')

  useEffect(() => {
    if (!employee) return
    fetchDashboardData()
  }, [employee])

  const fetchDashboardData = async () => {
    if (!employee) return
    setLoading(true)

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    if (canViewStats) {
      // Employee counts
      const { count: totalEmp } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })

      const { count: activeEmp } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      setTotalEmployees(totalEmp || 0)
      setActiveEmployees(activeEmp || 0)
      setInactiveEmployees((totalEmp || 0) - (activeEmp || 0))

      // Active projects
      const { count: projCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
      setActiveProjects(projCount || 0)

      // Pending leaves
      const { data: pendingData } = await supabase
        .from('leaves')
        .select(`
          id, start_date, end_date, status, days_count,
          employee:employees!leaves_employee_id_fkey(first_name, last_name, employee_id),
          leave_type:leave_types(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      setPendingLeaves(pendingData?.length || 0)
      setRecentLeaves(pendingData || [])

      // Payroll status
      const { data: payrollPeriod } = await supabase
        .from('payroll_periods')
        .select('is_processed')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle()
      setPayrollProcessed(payrollPeriod?.is_processed || false)

      // Department distribution chart
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
      if (deptData && deptData.length > 0) {
        const deptCounts = []
        for (const dept of deptData) {
          const { count } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .eq('is_active', true)
          deptCounts.push({ name: dept.name, count: count || 0 })
        }
        setDeptDistribution(deptCounts.filter(d => d.count > 0))
      }

      // Role distribution
      const roles = ['employee', 'manager', 'hr', 'ceo']
      const roleCounts = []
      for (const role of roles) {
        const { count } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('role', role)
          .eq('is_active', true)
        if (count && count > 0) {
          roleCounts.push({ name: role.charAt(0).toUpperCase() + role.slice(1), value: count })
        }
      }
      setRoleDistribution(roleCounts)

      // Leave type breakdown (current month)
      const { data: leaveData } = await supabase
        .from('leaves')
        .select('leave_type:leave_types(name), status')
        .gte('created_at', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
      const leaveMap = new Map()
      for (const l of (leaveData || [])) {
        const name = l.leave_type?.name || 'Other'
        leaveMap.set(name, (leaveMap.get(name) || 0) + 1)
      }
      setLeaveTypeBreakdown(Array.from(leaveMap.entries()).map(([name, value]) => ({ name, value })))

      // Attendance trend (last 7 days)
      const trendData = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })

        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', dateStr)
          .eq('status', 'present')

        const { count: absentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', dateStr)
          .eq('status', 'absent')

        trendData.push({
          day: dayLabel,
          present: presentCount || 0,
          absent: absentCount || 0,
        })
      }
      setAttendanceTrend(trendData)
    }

    // Personal data (for all roles)
    // Leave balances
    const { data: balances } = await supabase
      .from('leave_balances')
      .select(`
        total_days, used_days,
        leave_type:leave_types(name)
      `)
      .eq('employee_id', employee.id)
      .eq('year', currentYear)
    setLeaveBalances((balances as any[]) || [])

    // Today's attendance
    const today = new Date().toISOString().split('T')[0]
    const { data: todayAtt } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .maybeSingle()
    setTodayAttendance(todayAtt)

    // Monthly attendance summary
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const { data: monthAtt } = await supabase
      .from('attendance')
      .select('status, work_hours')
      .eq('employee_id', employee.id)
      .gte('date', startOfMonth.toISOString().split('T')[0])
    const summary = { present: 0, absent: 0, halfDay: 0, totalHours: 0 }
    for (const a of (monthAtt || [])) {
      if (a.status === 'present') summary.present++
      else if (a.status === 'absent') summary.absent++
      else if (a.status === 'half_day') summary.halfDay++
      summary.totalHours += a.work_hours || 0
    }
    setMonthlyAttendanceSummary(summary)

    // My projects
    const { data: projectMembers } = await supabase
      .from('project_members')
      .select('project:projects(id, name, status, start_date, end_date)')
      .eq('employee_id', employee.id)
    const projects = (projectMembers || []).map(pm => pm.project).filter(Boolean)
    setMyProjects(projects)

    // My recent leaves
    const { data: myLeaves } = await supabase
      .from('leaves')
      .select(`
        id, start_date, end_date, status, days_count,
        leave_type:leave_types(name)
      `)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setMyRecentLeaves((myLeaves as any[]) || [])

    // Upcoming birthdays (next 30 days)
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, date_of_birth, designation, avatar_url')
      .eq('is_active', true)
      .not('date_of_birth', 'is', null)

    if (allEmployees) {
      const today = new Date()
      const thirtyDaysLater = new Date()
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

      const birthdayList = allEmployees
        .map(emp => {
          const dob = new Date(emp.date_of_birth)
          const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
          if (birthdayThisYear < today) {
            birthdayThisYear.setFullYear(today.getFullYear() + 1)
          }
          return {
            ...emp,
            upcomingBirthday: birthdayThisYear,
            daysUntil: Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
          }
        })
        .filter(emp => emp.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5)
      setUpcomingBirthdays(birthdayList)
    }

    // Upcoming work anniversaries (next 30 days)
    const { data: employeesWithDOJ } = await supabase
      .from('employees')
      .select('id, first_name, last_name, date_of_joining, designation, avatar_url')
      .eq('is_active', true)
      .not('date_of_joining', 'is', null)

    if (employeesWithDOJ) {
      const today = new Date()
      const anniversaryList = employeesWithDOJ
        .map(emp => {
          const doj = new Date(emp.date_of_joining)
          const anniversaryThisYear = new Date(today.getFullYear(), doj.getMonth(), doj.getDate())
          if (anniversaryThisYear < today) {
            anniversaryThisYear.setFullYear(today.getFullYear() + 1)
          }
          const yearsCompleted = anniversaryThisYear.getFullYear() - doj.getFullYear()
          return {
            ...emp,
            upcomingAnniversary: anniversaryThisYear,
            daysUntil: Math.ceil((anniversaryThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            years: yearsCompleted,
          }
        })
        .filter(emp => emp.daysUntil <= 30 && emp.years >= 1)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5)
      setUpcomingAnniversaries(anniversaryList)
    }

    // Upcoming holidays (next 30 days)
    const todayStr = new Date().toISOString().split('T')[0]
    const thirtyDaysLaterStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: holidaysData } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', todayStr)
      .lte('date', thirtyDaysLaterStr)
      .order('date')
      .limit(5)
    setUpcomingHolidays((holidaysData as any[]) || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 stagger-children">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
          Welcome back, {employee?.first_name}!
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ─── PERSONAL QUICK STATS (all roles) ─── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 sm:text-sm">Today</p>
                <p className="text-base font-bold sm:text-xl truncate">
                  {todayAttendance?.check_in ? `In at ${todayAttendance.check_in}` : 'Not Marked'}
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 sm:text-sm">Present Days</p>
                <p className="text-base font-bold sm:text-xl">{monthlyAttendanceSummary.present}</p>
                <p className="text-[10px] text-slate-400 sm:text-xs">this month</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 sm:text-sm">Work Hours</p>
                <p className="text-base font-bold sm:text-xl">{monthlyAttendanceSummary.totalHours.toFixed(1)}h</p>
                <p className="text-[10px] text-slate-400 sm:text-xs">this month</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-l-4 border-l-cyan-500 bg-gradient-to-br from-white to-cyan-50/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 sm:text-sm">My Projects</p>
                <p className="text-base font-bold sm:text-xl">{myProjects.length}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100">
                <Briefcase className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── BIRTHDAYS, ANNIVERSARIES & HOLIDAYS ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Birthdays */}
        <Card className="border-t-4 border-t-pink-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-5 w-5 text-pink-500" />
              Upcoming Birthdays
            </CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBirthdays.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-slate-400">
                <Cake className="h-8 w-8 mb-2" />
                <p className="text-sm">No upcoming birthdays</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBirthdays.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100">
                      <span className="text-sm font-semibold text-pink-600">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">
                        {emp.upcomingBirthday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {emp.daysUntil === 0 ? (
                      <Badge className="bg-pink-500 text-xs">Today!</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">in {emp.daysUntil}d</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Anniversaries */}
        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-purple-500" />
              Work Anniversaries
            </CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAnniversaries.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-slate-400">
                <Gift className="h-8 w-8 mb-2" />
                <p className="text-sm">No upcoming anniversaries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAnniversaries.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100">
                      <Gift className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">
                        {emp.years} years | {emp.upcomingAnniversary.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {emp.daysUntil === 0 ? (
                      <Badge className="bg-purple-500 text-xs">Today!</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">in {emp.daysUntil}d</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Holidays */}
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PartyPopper className="h-5 w-5 text-emerald-500" />
              Upcoming Holidays
            </CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingHolidays.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-slate-400">
                <PartyPopper className="h-8 w-8 mb-2" />
                <p className="text-sm">No upcoming holidays</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <PartyPopper className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{holiday.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {holiday.is_optional ? (
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    ) : (
                      <Badge className="bg-emerald-500 text-xs">Holiday</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── ADMIN STATS (HR/Manager/CEO) ─── */}
      {canViewStats && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{totalEmployees}</div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <span className="text-green-600">{activeEmployees} active</span>
                <span className="text-slate-400">|</span>
                <span className="text-red-600">{inactiveEmployees} inactive</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{activeProjects}</div>
              <p className="text-[10px] sm:text-xs text-slate-500">Currently running</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending Leaves</CardTitle>
              <CalendarDays className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{pendingLeaves}</div>
              <p className="text-[10px] sm:text-xs text-slate-500">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Payroll Status</CardTitle>
              <IndianRupee className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center gap-2">
                {payrollProcessed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    <span className="text-sm sm:text-lg font-semibold text-green-600">Processed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                    <span className="text-sm sm:text-lg font-semibold text-amber-600">Pending</span>
                  </>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500">
                {new Date().toLocaleString('default', { month: 'long' })} payroll
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── CHARTS + LEAVE BALANCE ─── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Leave Balance - functional with real data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              My Leave Balance
            </CardTitle>
            <CardDescription>Remaining leave days for {new Date().getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveBalances.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-500">
                <CalendarDays className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm">No leave balances assigned yet</p>
                <p className="text-xs text-slate-400">Contact HR to set up your leave balances</p>
              </div>
            ) : (
              leaveBalances.map((balance) => {
                const remaining = balance.total_days - balance.used_days
                const percentage = balance.total_days > 0 ? (remaining / balance.total_days) * 100 : 0
                const isLow = percentage <= 20
                return (
                  <div key={balance.leave_type.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{balance.leave_type.name}</span>
                      <span className={`font-medium ${isLow ? 'text-red-600' : 'text-slate-600'}`}>
                        {remaining} / {balance.total_days} days
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={`h-2.5 ${isLow ? '[&>div]:bg-red-500' : ''}`}
                    />
                    {isLow && (
                      <p className="text-xs text-red-500">Low balance remaining</p>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Admin: Attendance Trend Chart */}
        {canViewStats && attendanceTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Attendance Trend
              </CardTitle>
              <CardDescription>Last 7 days overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Employee: My Recent Leaves */}
        {!canViewStats && myRecentLeaves.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                My Recent Leaves
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myRecentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{leave.leave_type?.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(leave.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        {' - '}
                        {new Date(leave.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        <span className="ml-1">({leave.days_count}d)</span>
                      </p>
                    </div>
                    <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                      {leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin: Department Distribution */}
        {canViewStats && deptDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Department Distribution
              </CardTitle>
              <CardDescription>Employees per department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deptDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {deptDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Admin: Pending Leave Requests */}
        {canViewStats && recentLeaves.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription>Leave requests awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {leave.employee?.first_name} {leave.employee?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {leave.leave_type?.name} | {new Date(leave.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        {' - '}
                        {new Date(leave.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">Pending</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin: Role Distribution */}
        {canViewStats && roleDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={roleDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {roleDistribution.map((_, index) => (
                      <Cell key={`role-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Admin: Leave Type Breakdown */}
        {canViewStats && leaveTypeBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Leave Requests This Month
              </CardTitle>
              <CardDescription>By leave type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={leaveTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {leaveTypeBreakdown.map((_, index) => (
                      <Cell key={`lt-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── MY PROJECTS (all roles) ─── */}
      {myProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <FolderKanban className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{project.name}</p>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="mt-1 text-xs">
                      {project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

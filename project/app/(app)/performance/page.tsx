// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Edit, Trash2, Target, TrendingUp, AlertTriangle, CheckCircle2, BarChart3, Award,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'

interface KPICategory {
  id: string
  name: string
  description: string | null
  weight: number
}

interface KPIScorecard {
  id: string
  employee_id: string
  kpi_category_id: string
  title: string
  description: string | null
  target_value: number
  actual_value: number
  unit: string
  period_year: number
  period_quarter: number | null
  weight: number
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  category: KPICategory
  employee: { first_name: string; last_name: string; employee_id: string; designation: string | null; department: { name: string } | null }
}

export default function PerformancePage() {
  const { employee, isRole } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<KPICategory[]>([])
  const [scorecards, setScorecards] = useState<KPIScorecard[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKPI, setEditingKPI] = useState<KPIScorecard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KPIScorecard | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const canManage = isRole('hr', 'ceo', 'manager')

  const [form, setForm] = useState({
    employee_id: '',
    kpi_category_id: '',
    title: '',
    description: '',
    target_value: '',
    actual_value: '0',
    unit: '%',
    period_year: new Date().getFullYear(),
    period_quarter: '',
    weight: '100',
    status: 'on_track',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)

    const { data: cats } = await supabase.from('kpi_categories').select('*').order('name')
    setCategories(cats || [])

    const { data: emps } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_id, designation, department:departments!employees_department_id_fkey(name)')
      .eq('is_active', true)
      .order('first_name')
    setEmployees(emps || [])

    await fetchScorecards()
    setLoading(false)
  }

  const fetchScorecards = async () => {
    let query = supabase
      .from('kpi_scorecards')
      .select('*, category:kpi_categories(*), employee:employees!kpi_scorecards_employee_id_fkey(first_name, last_name, employee_id, designation, department:departments!employees_department_id_fkey(name))')
      .order('created_at', { ascending: false })

    if (!canManage && employee) {
      query = query.eq('employee_id', employee.id)
    }

    const { data } = await query
    setScorecards((data as any[]) || [])
  }

  const filteredScorecards = scorecards.filter(sc => {
    if (selectedEmployee !== 'all' && sc.employee_id !== selectedEmployee) return false
    if (selectedQuarter !== 'all' && sc.period_quarter !== parseInt(selectedQuarter)) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    setLoading(true)

    const payload = {
      employee_id: form.employee_id,
      kpi_category_id: form.kpi_category_id,
      title: form.title,
      description: form.description || null,
      target_value: parseFloat(form.target_value),
      actual_value: parseFloat(form.actual_value),
      unit: form.unit,
      period_year: form.period_year,
      period_quarter: form.period_quarter ? parseInt(form.period_quarter) : null,
      weight: parseFloat(form.weight),
      status: form.status,
    }

    if (editingKPI) {
      const { error } = await supabase.from('kpi_scorecards').update(payload).eq('id', editingKPI.id)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else { toast({ title: 'Success', description: 'KPI updated' }); fetchScorecards(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('kpi_scorecards').insert(payload)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else { toast({ title: 'Success', description: 'KPI created' }); fetchScorecards(); setDialogOpen(false) }
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('kpi_scorecards').delete().eq('id', deleteTarget.id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Success', description: 'KPI deleted' }); fetchScorecards() }
    setDeleteTarget(null)
  }

  const openEdit = (kpi: KPIScorecard) => {
    setEditingKPI(kpi)
    setForm({
      employee_id: kpi.employee_id,
      kpi_category_id: kpi.kpi_category_id,
      title: kpi.title,
      description: kpi.description || '',
      target_value: String(kpi.target_value),
      actual_value: String(kpi.actual_value),
      unit: kpi.unit,
      period_year: kpi.period_year,
      period_quarter: kpi.period_quarter ? String(kpi.period_quarter) : '',
      weight: String(kpi.weight),
      status: kpi.status,
    })
    setDialogOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'on_track': return <TrendingUp className="h-4 w-4 text-blue-500" />
      case 'at_risk': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'behind': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Target className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'exceeded': return <Badge className="bg-green-100 text-green-700 text-xs">Exceeded</Badge>
      case 'on_track': return <Badge className="bg-blue-100 text-blue-700 text-xs">On Track</Badge>
      case 'at_risk': return <Badge className="bg-amber-100 text-amber-700 text-xs">At Risk</Badge>
      case 'behind': return <Badge className="bg-red-100 text-red-700 text-xs">Behind</Badge>
      default: return <Badge variant="secondary" className="text-xs">Not Started</Badge>
    }
  }

  // Compute overall score for an employee
  const getEmployeeScores = () => {
    const empMap = new Map<string, { name: string; kpis: KPIScorecard[] }>()
    for (const sc of filteredScorecards) {
      const key = sc.employee_id
      if (!empMap.has(key)) {
        empMap.set(key, { name: `${sc.employee.first_name} ${sc.employee.last_name}`, kpis: [] })
      }
      empMap.get(key)!.kpis.push(sc)
    }
    return Array.from(empMap.entries()).map(([id, data]) => {
      const totalWeight = data.kpis.reduce((s, k) => s + k.weight, 0)
      const weightedScore = data.kpis.reduce((s, k) => {
        const pct = k.target_value > 0 ? (k.actual_value / k.target_value) * 100 : 0
        return s + (pct * k.weight)
      }, 0)
      const overall = totalWeight > 0 ? weightedScore / totalWeight : 0
      return { id, name: data.name, overall: Math.round(overall), kpiCount: data.kpis.length }
    }).sort((a, b) => b.overall - a.overall)
  }

  // Radar chart data for selected employee
  const getRadarData = () => {
    const targetKpis = selectedEmployee === 'all' ? filteredScorecards : filteredScorecards.filter(sc => sc.employee_id === selectedEmployee)
    const catMap = new Map<string, { name: string; avgPct: number }>()
    for (const sc of targetKpis) {
      const catName = sc.category?.name || 'Other'
      const pct = sc.target_value > 0 ? (sc.actual_value / sc.target_value) * 100 : 0
      if (!catMap.has(catName)) catMap.set(catName, { name: catName, avgPct: 0 })
      const existing = catMap.get(catName)!
      existing.avgPct = (existing.avgPct + pct) / 2
    }
    return Array.from(catMap.values()).map(d => ({ ...d, avgPct: Math.min(Math.round(d.avgPct), 100) }))
  }

  // Bar chart data
  const getBarData = () => {
    return getEmployeeScores().slice(0, 10).map(s => ({ name: s.name.split(' ')[0], score: s.overall }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">KPI Scorecards</h1>
          <p className="mt-1 text-slate-500">Track and evaluate employee performance</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingKPI(null); setForm({ employee_id: '', kpi_category_id: '', title: '', description: '', target_value: '', actual_value: '0', unit: '%', period_year: new Date().getFullYear(), period_quarter: '', weight: '100', status: 'on_track' }); setDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add KPI
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="scorecards" className="gap-2"><Target className="h-4 w-4" />Scorecards</TabsTrigger>
            <TabsTrigger value="rankings" className="gap-2"><Award className="h-4 w-4" />Rankings</TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW ─── */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total KPIs</p>
                      <p className="text-2xl font-bold">{filteredScorecards.length}</p>
                    </div>
                    <Target className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">On Track</p>
                      <p className="text-2xl font-bold text-blue-600">{filteredScorecards.filter(s => s.status === 'on_track').length}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">At Risk</p>
                      <p className="text-2xl font-bold text-amber-600">{filteredScorecards.filter(s => s.status === 'at_risk').length}</p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Exceeded</p>
                      <p className="text-2xl font-bold text-green-600">{filteredScorecards.filter(s => s.status === 'exceeded').length}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Performance by category */}
              {getRadarData().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={getRadarData()}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Achievement %" dataKey="avgPct" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Score distribution */}
              {getBarData().length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overall Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getBarData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {getBarData().map((entry, index) => (
                            <rect key={index} fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#3b82f6' : entry.score >= 40 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── SCORECARDS ─── */}
          <TabsContent value="scorecards" className="mt-4">
            <div className="flex flex-wrap gap-3 mb-4">
              {canManage && (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="All Employees" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All Quarters" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredScorecards.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Target className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No KPI scorecards found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredScorecards.map(kpi => {
                  const pct = kpi.target_value > 0 ? (kpi.actual_value / kpi.target_value) * 100 : 0
                  return (
                    <Card key={kpi.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5">{getStatusIcon(kpi.status)}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{kpi.title}</p>
                                {getStatusBadge(kpi.status)}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                                <span>{kpi.employee.first_name} {kpi.employee.last_name}</span>
                                {kpi.employee.department && <span>{kpi.employee.department.name}</span>}
                                <span>{kpi.category?.name}</span>
                                {kpi.period_quarter && <span>Q{kpi.period_quarter} {kpi.period_year}</span>}
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                <Progress value={Math.min(pct, 100)} className="h-2 flex-1 max-w-[200px]" />
                                <span className="text-xs font-medium">
                                  {kpi.actual_value}/{kpi.target_value} {kpi.unit}
                                  <span className="text-slate-400 ml-1">({Math.round(pct)}%)</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex shrink-0 gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(kpi)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteTarget(kpi)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── RANKINGS ─── */}
          <TabsContent value="rankings" className="mt-4">
            {getEmployeeScores().length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Award className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No performance data to rank</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>KPIs</TableHead>
                        <TableHead className="text-right">Overall Score</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getEmployeeScores().map((emp, idx) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-bold text-center">
                            {idx < 3 ? (
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-slate-500">{idx + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.kpiCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={emp.overall} className="h-2 w-20" />
                              <span className="font-semibold text-sm">{emp.overall}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={emp.overall >= 80 ? 'bg-green-100 text-green-700' : emp.overall >= 60 ? 'bg-blue-100 text-blue-700' : emp.overall >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                              {emp.overall >= 80 ? 'Excellent' : emp.overall >= 60 ? 'Good' : emp.overall >= 40 ? 'Average' : 'Needs Improvement'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ─── KPI DIALOG ─── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingKPI(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKPI ? 'Edit KPI' : 'Add KPI Scorecard'}</DialogTitle>
            <DialogDescription>{editingKPI ? 'Update KPI details' : 'Define a new performance metric'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.kpi_category_id} onValueChange={(v) => setForm({ ...form, kpi_category_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KPI Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sprint velocity" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Actual Value</Label>
                <Input type="number" value={form.actual_value} onChange={(e) => setForm({ ...form, actual_value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%">Percentage (%)</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="behind">Behind</SelectItem>
                    <SelectItem value="exceeded">Exceeded</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Quarter</Label>
                <Select value={form.period_quarter} onValueChange={(v) => setForm({ ...form, period_quarter: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE KPI ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  Plus, Building2, Users, Edit, Trash2, UserCheck, ChevronRight, LayoutGrid, List,
} from 'lucide-react'

interface DeptWithMeta {
  id: string
  name: string
  description: string | null
  parent_department_id: string | null
  head_id: string | null
  employee_count: number
  head: { first_name: string; last_name: string; employee_id: string } | null
  parent: { name: string } | null
  teams: TeamWithCount[]
}

interface TeamWithCount {
  id: string
  name: string
  department_id: string
  lead_id: string | null
  description: string | null
  member_count: number
  lead: { first_name: string; last_name: string } | null
}

interface EmployeeOption {
  id: string
  first_name: string
  last_name: string
  employee_id: string
}

export default function DepartmentsPage() {
  const { isRole } = useAuth()
  const [departments, setDepartments] = useState<DeptWithMeta[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<DeptWithMeta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeptWithMeta | null>(null)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamWithCount | null>(null)
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<TeamWithCount | null>(null)
  const [selectedDeptForTeam, setSelectedDeptForTeam] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { toast } = useToast()

  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    parent_department_id: '',
    head_id: '',
  })

  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    lead_id: '',
    department_id: '',
  })

  const canManage = isRole('hr', 'ceo', 'manager')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: emps } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_id')
      .eq('is_active', true)
      .order('first_name')
    setEmployees(emps || [])

    const { data: depts } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    const { data: teams } = await supabase
      .from('teams')
      .select('*, lead:employees!teams_lead_id_fkey(first_name, last_name)')

    if (depts) {
      const deptMap = new Map(depts.map(d => [d.id, d.name]))

      const enriched = await Promise.all(
        depts.map(async (dept) => {
          const { count: empCount } = await supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .eq('is_active', true)

          // Resolve head manually
          let head = null
          if (dept.head_id) {
            const headEmp = (emps || []).find(e => e.id === dept.head_id)
            if (headEmp) head = { first_name: headEmp.first_name, last_name: headEmp.last_name, employee_id: headEmp.employee_id }
          }

          // Resolve parent manually
          let parent = null
          if (dept.parent_department_id) {
            const parentName = deptMap.get(dept.parent_department_id)
            if (parentName) parent = { name: parentName }
          }

          const deptTeams = (teams || []).filter(t => t.department_id === dept.id)
          const teamsWithCount = await Promise.all(
            deptTeams.map(async (team) => {
              const { count: memberCount } = await supabase
                .from('employees')
                .select('id', { count: 'exact', head: true })
                .eq('department_id', dept.id)

              return { ...team, member_count: memberCount || 0 }
            })
          )

          return {
            ...dept,
            employee_count: empCount || 0,
            head,
            parent,
            teams: teamsWithCount,
          }
        })
      )
      setDepartments(enriched)
    }
    setLoading(false)
  }

  // ─── DEPARTMENT CRUD ───
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    setLoading(true)

    const payload = {
      name: deptForm.name,
      description: deptForm.description || null,
      parent_department_id: deptForm.parent_department_id || null,
      head_id: deptForm.head_id || null,
    }

    if (editingDept) {
      const { error } = await supabase.from('departments').update(payload).eq('id', editingDept.id)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else { toast({ title: 'Success', description: 'Department updated' }); fetchAll(); setDialogOpen(false) }
    } else {
      const { error } = await supabase.from('departments').insert(payload)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else { toast({ title: 'Success', description: 'Department created' }); fetchAll(); setDialogOpen(false) }
    }
    setLoading(false)
  }

  const handleDeleteDept = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('departments').delete().eq('id', deleteTarget.id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Success', description: 'Department deleted' }); fetchAll() }
    setDeleteTarget(null)
  }

  const openEditDept = (dept: DeptWithMeta) => {
    setEditingDept(dept)
    setDeptForm({
      name: dept.name,
      description: dept.description || '',
      parent_department_id: dept.parent_department_id || '',
      head_id: dept.head_id || '',
    })
    setDialogOpen(true)
  }

  // ─── TEAM CRUD ───
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    setLoading(true)

    const payload = {
      name: teamForm.name,
      description: teamForm.description || null,
      lead_id: teamForm.lead_id || null,
      department_id: teamForm.department_id || selectedDeptForTeam,
    }

    if (editingTeam) {
      const { error } = await supabase.from('teams').update(payload).eq('id', editingTeam.id)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else { toast({ title: 'Success', description: 'Team updated' }); fetchAll(); setTeamDialogOpen(false) }
    } else {
      const { error } = await supabase.from('teams').insert(payload)
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
      else { toast({ title: 'Success', description: 'Team created' }); fetchAll(); setTeamDialogOpen(false) }
    }
    setLoading(false)
  }

  const handleDeleteTeam = async () => {
    if (!deleteTeamTarget) return
    const { error } = await supabase.from('teams').delete().eq('id', deleteTeamTarget.id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Success', description: 'Team deleted' }); fetchAll() }
    setDeleteTeamTarget(null)
  }

  const openTeamDialog = (deptId: string, team?: TeamWithCount) => {
    setSelectedDeptForTeam(deptId)
    if (team) {
      setEditingTeam(team)
      setTeamForm({ name: team.name, description: team.description || '', lead_id: team.lead_id || '', department_id: deptId })
    } else {
      setEditingTeam(null)
      setTeamForm({ name: '', description: '', lead_id: '', department_id: deptId })
    }
    setTeamDialogOpen(true)
  }

  // Build hierarchy tree
  const rootDepts = departments.filter(d => !d.parent_department_id)
  const getChildren = (parentId: string) => departments.filter(d => d.parent_department_id === parentId)

  const renderHierarchy = (depts: DeptWithMeta[], depth = 0) => (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-4' : ''}>
      {depts.map(dept => (
        <div key={dept.id} className="mb-3">
          <div className="flex items-center gap-3 rounded-lg border bg-white p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{dept.name}</p>
                {dept.parent && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {dept.parent.name}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{dept.employee_count} employees</span>
                {dept.head && (
                  <span className="text-xs text-slate-500">
                    Head: {dept.head.first_name} {dept.head.last_name}
                  </span>
                )}
                {dept.teams.length > 0 && (
                  <span className="text-xs text-slate-500">{dept.teams.length} teams</span>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTeamDialog(dept.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDept(dept)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(dept)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {dept.teams.length > 0 && (
            <div className="ml-6 mt-2 space-y-1">
              {dept.teams.map(team => (
                <div key={team.id} className="flex items-center justify-between rounded-md border border-dashed bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm truncate">{team.name}</span>
                    {team.lead && (
                      <span className="text-xs text-slate-400">Lead: {team.lead.first_name} {team.lead.last_name}</span>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTeamDialog(dept.id, team)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteTeamTarget(team)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {getChildren(dept.id).length > 0 && renderHierarchy(getChildren(dept.id), depth + 1)}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Organization Management</h1>
          <p className="mt-1 text-slate-500">Departments, teams, and reporting structure</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button onClick={() => { setEditingDept(null); setDeptForm({ name: '', description: '', parent_department_id: '', head_id: '' }); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
        </div>
      ) : (
        <Tabs defaultValue="hierarchy">
          <TabsList>
            <TabsTrigger value="hierarchy" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Hierarchy
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
          </TabsList>

          {/* ─── HIERARCHY VIEW ─── */}
          <TabsContent value="hierarchy" className="mt-4">
            {rootDepts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Building2 className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No departments yet</p>
                </CardContent>
              </Card>
            ) : (
              renderHierarchy(rootDepts)
            )}
          </TabsContent>

          {/* ─── DEPARTMENTS GRID/LIST ─── */}
          <TabsContent value="departments" className="mt-4">
            <div className="flex justify-end mb-3">
              <div className="flex rounded-md border">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map(dept => (
                  <Card key={dept.id} className="relative overflow-hidden">
                    {dept.parent_department_id && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300" />
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{dept.name}</CardTitle>
                            {dept.parent && (
                              <p className="text-xs text-slate-400">Parent: {dept.parent.name}</p>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDept(dept)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription className="mt-1">{dept.description || 'No description'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Employees</span>
                          <Badge variant="secondary">{dept.employee_count}</Badge>
                        </div>
                        {dept.head && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Head</span>
                            <span className="font-medium">{dept.head.first_name} {dept.head.last_name}</span>
                          </div>
                        )}
                        {dept.teams.length > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Teams</span>
                            <Badge variant="outline">{dept.teams.length}</Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Head</TableHead>
                        <TableHead className="text-center">Employees</TableHead>
                        <TableHead className="text-center">Teams</TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map(dept => (
                        <TableRow key={dept.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{dept.name}</p>
                              <p className="text-xs text-slate-500">{dept.description || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{dept.parent?.name || '-'}</TableCell>
                          <TableCell>{dept.head ? `${dept.head.first_name} ${dept.head.last_name}` : '-'}</TableCell>
                          <TableCell className="text-center">{dept.employee_count}</TableCell>
                          <TableCell className="text-center">{dept.teams.length}</TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDept(dept)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteTarget(dept)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── ALL TEAMS ─── */}
          <TabsContent value="teams" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.flatMap(d => d.teams.map(t => ({ ...t, deptName: d.name }))).length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center py-12">
                    <Users className="h-12 w-12 text-slate-300" />
                    <p className="mt-2 text-slate-500">No teams created yet</p>
                  </CardContent>
                </Card>
              ) : (
                departments.flatMap(d => d.teams.map(t => ({ ...t, deptName: d.name }))).map(team => (
                  <Card key={team.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                            <Users className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{team.name}</CardTitle>
                            <p className="text-xs text-slate-400">{team.deptName}</p>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTeamDialog(team.department_id, team)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {team.lead && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Lead</span>
                            <span className="font-medium">{team.lead.first_name} {team.lead.last_name}</span>
                          </div>
                        )}
                        {team.description && (
                          <p className="text-slate-500 text-xs">{team.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ─── DEPARTMENT DIALOG ─── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingDept(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>{editingDept ? 'Update department details' : 'Create a new department'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeptSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Parent Department</Label>
              <Select value={deptForm.parent_department_id} onValueChange={(v) => setDeptForm({ ...deptForm, parent_department_id: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None (Top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None (Top-level)</SelectItem>
                  {departments.filter(d => d.id !== editingDept?.id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select value={deptForm.head_id} onValueChange={(v) => setDeptForm({ ...deptForm, head_id: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select head" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── TEAM DIALOG ─── */}
      <Dialog open={teamDialogOpen} onOpenChange={(open) => { setTeamDialogOpen(open); if (!open) setEditingTeam(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Add Team'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
              <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Team Lead</Label>
              <Select value={teamForm.lead_id} onValueChange={(v) => setTeamForm({ ...teamForm, lead_id: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE DEPARTMENT ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteDept}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DELETE TEAM ─── */}
      <AlertDialog open={!!deleteTeamTarget} onOpenChange={(open) => !open && setDeleteTeamTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{deleteTeamTarget?.name}&quot;?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteTeam}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

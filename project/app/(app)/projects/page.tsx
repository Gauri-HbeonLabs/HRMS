// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Project, Employee, Department } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  Users,
  DollarSign,
  Edit,
  Eye,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface ProjectWithDetails extends Project {
  department: Department | null
  manager: { first_name: string; last_name: string } | null
  member_count: number
}

export default function ProjectsPage() {
  const { isRole } = useAuth()
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [assignDialogProject, setAssignDialogProject] = useState<ProjectWithDetails | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
    budget: '',
    department_id: '',
    manager_id: '',
  })

  useEffect(() => {
    fetchProjects()
    fetchDropdownData()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        department:departments!projects_department_id_fkey(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      const managerIds = (data || []).filter(p => p.manager_id).map(p => p.manager_id)
      const { data: managers } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', managerIds)

      const managerMap = new Map((managers || []).map(m => [m.id, m]))

      const projectsWithMembers = await Promise.all(
        (data || []).map(async (project) => {
          const { count } = await supabase
            .from('project_members')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id)
          return {
            ...project,
            member_count: count || 0,
            manager: project.manager_id ? managerMap.get(project.manager_id) : null
          }
        })
      )
      setProjects(projectsWithMembers)
    }
    setLoading(false)
  }

  const fetchDropdownData = async () => {
    const { data: empData } = await supabase.from('employees').select('id, first_name, last_name, employee_id, role, designation').eq('is_active', true)
    const { data: deptData } = await supabase.from('departments').select('*')
    setEmployees(empData || [])
    setDepartments(deptData || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isRole('manager', 'hr', 'ceo')) {
      toast({ title: 'Error', description: 'You do not have permission to manage projects', variant: 'destructive' })
      return
    }

    setLoading(true)
    const projectData = {
      name: formData.name,
      description: formData.description || null,
      status: formData.status as any,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      department_id: formData.department_id || null,
      manager_id: formData.manager_id || null,
    }

    if (editingProject) {
      const { error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProject.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Project updated successfully' })
        fetchProjects()
        setDialogOpen(false)
      }
    } else {
      const { error } = await supabase.from('projects').insert(projectData)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Project created successfully' })
        fetchProjects()
        setDialogOpen(false)
        resetForm()
      }
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget || !isRole('manager', 'hr', 'ceo')) return

    // Remove members first
    await supabase.from('project_members').delete().eq('project_id', deleteTarget.id)

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Project deleted successfully' })
      fetchProjects()
    }
    setDeleteTarget(null)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      budget: '',
      department_id: '',
      manager_id: '',
    })
    setEditingProject(null)
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date || '',
      budget: project.budget?.toString() || '',
      department_id: project.department_id || '',
      manager_id: project.manager_id || '',
    })
    setDialogOpen(true)
  }

  const openAssignDialog = async (project: ProjectWithDetails) => {
    setAssignDialogProject(project)
    setAssignSearch('')
    const { data } = await supabase
      .from('project_members')
      .select('employee_id')
      .eq('project_id', project.id)
    setAssignedIds((data || []).map(m => m.employee_id))
  }

  const handleToggleAssign = async (empId: string) => {
    if (!assignDialogProject) return

    const isAssigned = assignedIds.includes(empId)

    if (isAssigned) {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', assignDialogProject.id)
        .eq('employee_id', empId)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        return
      }
      setAssignedIds(prev => prev.filter(id => id !== empId))
      toast({ title: 'Removed', description: 'Employee removed from project' })
    } else {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: assignDialogProject.id,
          employee_id: empId,
          role: 'member',
        })

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
        return
      }
      setAssignedIds(prev => [...prev, empId])
      toast({ title: 'Assigned', description: 'Employee assigned to project' })
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; class: string }> = {
      active: { variant: 'default', class: 'bg-green-500' },
      completed: { variant: 'secondary', class: '' },
      on_hold: { variant: 'outline', class: 'text-amber-500 border-amber-500' },
      cancelled: { variant: 'destructive', class: '' },
    }
    return variants[status] || { variant: 'outline', class: '' }
  }

  const canManage = isRole('manager', 'hr', 'ceo')

  const filteredAssignEmployees = employees.filter(emp => {
    const query = assignSearch.toLowerCase()
    if (!query) return true
    return (
      emp.first_name.toLowerCase().includes(query) ||
      emp.last_name.toLowerCase().includes(query) ||
      (emp as any).employee_id?.toLowerCase().includes(query) ||
      (emp as any).designation?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-500">Manage company projects and assignments</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
              <FolderKanban className="h-12 w-12 mb-2" />
              <p>No projects found</p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const statusStyle = getStatusBadge(project.status)
              return (
                <Card key={project.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Link href={`/projects/${project.id}`}>
                        <CardTitle className="text-lg hover:text-blue-600 transition-colors cursor-pointer">
                          {project.name}
                        </CardTitle>
                      </Link>
                      <Badge variant={statusStyle.variant} className={statusStyle.class}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {project.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {project.member_count} members
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(project.start_date).toLocaleDateString()}
                      </div>
                      {project.budget && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Rs. {project.budget.toLocaleString()}
                        </div>
                      )}
                    </div>
                    {project.manager && (
                      <p className="mb-3 text-sm text-slate-600">
                        Manager: {project.manager.first_name} {project.manager.last_name}
                      </p>
                    )}

                    <div className="flex items-center gap-1 pt-2 border-t">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-600">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => openEditDialog(project)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => openAssignDialog(project)}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(project)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update project details' : 'Fill in the project details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="Rs."
                />
              </div>
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
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_id">Project Manager</Label>
                <Select value={formData.manager_id} onValueChange={(value) => setFormData({ ...formData, manager_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.role === 'manager' || e.role === 'ceo' || e.role === 'hr').map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingProject ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Employees Dialog */}
      <Dialog open={!!assignDialogProject} onOpenChange={(open) => { if (!open) { setAssignDialogProject(null); fetchProjects() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Employees</DialogTitle>
            <DialogDescription>
              Search by employee name or ID and toggle assignment for &quot;{assignDialogProject?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, employee ID, or designation..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {filteredAssignEmployees.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No employees found</p>
              ) : (
                filteredAssignEmployees.map((emp) => {
                  const isAssigned = assignedIds.includes(emp.id)
                  return (
                    <div
                      key={emp.id}
                      className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                        isAssigned ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleToggleAssign(emp.id)}
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          ID: {(emp as any).employee_id} &middot; {(emp as any).designation || 'N/A'}
                        </p>
                      </div>
                      {isAssigned ? (
                        <Badge variant="default" className="bg-blue-600">Assigned</Badge>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => { setAssignDialogProject(null); fetchProjects() }}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This will also remove all team member assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

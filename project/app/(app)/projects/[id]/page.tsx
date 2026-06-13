// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Project, Employee, Department } from '@/lib/database.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
} from 'lucide-react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ProjectDetail extends Project {
  department: { name: string } | null
  manager: { id: string; first_name: string; last_name: string } | null
}

interface ProjectMember {
  id: string
  employee_id: string
  role: string
  employee: {
    first_name: string
    last_name: string
    designation: string
    avatar_url: string
  }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isRole, employee: currentUser } = useAuth()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const [editForm, setEditForm] = useState({
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
    fetchProject()
    fetchMembers()
    fetchEmployees()
  }, [params.id])

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        department:departments!projects_department_id_fkey(name)
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      router.push('/projects')
      return
    }

    let managerData = null
    if (data?.manager_id) {
      const { data: mgrData } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('id', data.manager_id)
        .single()
      managerData = mgrData
    }

    setProject({ ...data, manager: managerData })
    setEditForm({
      name: data.name,
      description: data.description || '',
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date || '',
      budget: data.budget?.toString() || '',
      department_id: data.department_id || '',
      manager_id: data.manager_id || '',
    })
    setLoading(false)
  }

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('project_members')
      .select(`
        id,
        employee_id,
        role,
        employee:employees(first_name, last_name, designation, avatar_url)
      `)
      .eq('project_id', params.id)

    setMembers((data as any[]) || [])
  }

  const fetchEmployees = async () => {
    const { data: empData } = await supabase
      .from('employees')
      .select('id, first_name, last_name, designation, role')
      .eq('is_active', true)
    setEmployees((empData as any[]) || [])
    const { data: deptData } = await supabase.from('departments').select('*')
    setDepartments(deptData || [])
  }

  const handleAddMember = async () => {
    if (!selectedEmployee) return

    const { error } = await supabase.from('project_members').insert({
      project_id: params.id as string,
      employee_id: selectedEmployee,
      role: 'member',
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Member added successfully' })
      fetchMembers()
      setSelectedEmployee('')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from('project_members').delete().eq('id', memberId)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Member removed successfully' })
      fetchMembers()
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const projectData = {
      name: editForm.name,
      description: editForm.description || null,
      status: editForm.status as any,
      start_date: editForm.start_date,
      end_date: editForm.end_date || null,
      budget: editForm.budget ? parseFloat(editForm.budget) : null,
      department_id: editForm.department_id || null,
      manager_id: editForm.manager_id || null,
    }

    const { error } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', params.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Project updated successfully' })
      setEditOpen(false)
      fetchProject()
    }
  }

  const handleDelete = async () => {
    await supabase.from('project_members').delete().eq('project_id', params.id)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', params.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Project deleted successfully' })
      router.push('/projects')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; class: string }> = {
      active: { variant: 'default', class: 'bg-green-500' },
      completed: { variant: 'secondary', class: '' },
      on_hold: { variant: 'outline', class: 'text-amber-500 border-amber-500' },
      cancelled: { variant: 'destructive', class: '' },
    }
    return variants[status] || { variant: 'outline', class: '' }
  }

  const canManage = isRole('manager', 'hr', 'ceo') || project?.manager_id === currentUser?.id

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  if (!project) {
    return <div>Project not found</div>
  }

  const startDate = new Date(project.start_date)
  const endDate = project.end_date ? new Date(project.end_date) : new Date()
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysPassed = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
            <Badge {...getStatusBadge(project.status)}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-slate-500">{project.description || 'No description'}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Start: {startDate.toLocaleDateString()}</span>
                  <span>End: {project.end_date ? endDate.toLocaleDateString() : 'Ongoing'}</span>
                </div>
                <Progress value={project.status === 'completed' ? 100 : progress} className="h-2" />
                <p className="text-sm text-slate-500">
                  {project.status === 'completed'
                    ? 'Project completed'
                    : `${Math.round(progress)}% complete`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({members.length})
              </CardTitle>
              <CardDescription>People assigned to this project</CardDescription>
            </CardHeader>
            <CardContent>
              {canManage && (
                <div className="mb-4 flex gap-2">
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                            .filter(
                              (e) => !members.some((m) => m.employee_id === e.id)
                            )
                            .map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name}
                              </SelectItem>
                            ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMember} disabled={!selectedEmployee}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              )}

              {members.length === 0 ? (
                <p className="text-slate-500">No team members assigned</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.employee.avatar_url} />
                          <AvatarFallback>
                            {member.employee.first_name[0]}
                            {member.employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.employee.first_name} {member.employee.last_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {member.employee.designation}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <UserMinus className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Department</p>
                <p className="font-medium">{project.department?.name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Project Manager</p>
                <p className="font-medium">
                  {project.manager
                    ? `${project.manager.first_name} ${project.manager.last_name}`
                    : 'Not assigned'}
                </p>
              </div>
              {project.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Budget</p>
                    <p className="font-medium">Rs. {project.budget.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Project Name</Label>
              <Input
                id="edit_name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
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
                <Label htmlFor="edit_budget">Budget</Label>
                <Input
                  id="edit_budget"
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  placeholder="Rs."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_end_date">End Date</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_department_id">Department</Label>
                <Select value={editForm.department_id} onValueChange={(value) => setEditForm({ ...editForm, department_id: value })}>
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
                <Label htmlFor="edit_manager_id">Project Manager</Label>
                <Select value={editForm.manager_id} onValueChange={(value) => setEditForm({ ...editForm, manager_id: value })}>
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
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This will also remove all team member assignments. This action cannot be undone.
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

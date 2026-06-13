// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Employee, Department } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  Edit,
  Eye,
  Users,
  Mail,
  Phone,
  Building2,
  Trash2,
} from 'lucide-react'
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
import Link from 'next/link'

export default function EmployeesPage() {
  const { isRole } = useAuth()
  const [employees, setEmployees] = useState<(Employee & { department: Department | null })[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    designation: '',
    role: 'employee',
    date_of_joining: new Date().toISOString().split('T')[0],
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bank_name: '',
    bank_account: '',
    ifsc_code: '',
    pan_number: '',
    aadhaar_number: '',
  })

  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*, department:departments!employees_department_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      setEmployees(data || [])
    }
    setLoading(false)
  }

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*')
    setDepartments(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isRole('hr', 'ceo')) {
      toast({ title: 'Error', description: 'You do not have permission to add/edit employees', variant: 'destructive' })
      return
    }

    setLoading(true)
    const employeeData = {
      ...formData,
      department_id: formData.department_id || null,
      date_of_birth: formData.date_of_birth || null,
    }

    if (editingEmployee) {
      const { error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', editingEmployee.id)

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Employee updated successfully' })
        fetchEmployees()
        setDialogOpen(false)
      }
    }
    setLoading(false)
  }

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone || '',
      department_id: employee.department_id || '',
      designation: employee.designation || '',
      role: employee.role,
      date_of_joining: employee.date_of_joining,
      date_of_birth: employee.date_of_birth || '',
      address: employee.address || '',
      city: employee.city || '',
      state: employee.state || '',
      pincode: employee.pincode || '',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      ifsc_code: employee.ifsc_code || '',
      pan_number: employee.pan_number || '',
      aadhaar_number: employee.aadhaar_number || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget || !isRole('hr', 'ceo')) return

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Employee deleted successfully' })
      fetchEmployees()
    }
    setDeleteTarget(null)
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'default'
      case 'hr':
        return 'secondary'
      case 'manager':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-slate-500">Manage your workforce</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Employees
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employee_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-slate-500">{employee.designation}</p>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(employee.role)} className="capitalize">
                          {employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/employees/${employee.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {isRole('hr', 'ceo') && (
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isRole('hr', 'ceo') && (
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(employee)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input id="bank_name" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account">Bank Account</Label>
                <Input id="bank_account" value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input id="ifsc_code" value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input id="pan_number" value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.first_name} {deleteTarget?.last_name}? This action cannot be undone and will permanently remove the employee record.
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

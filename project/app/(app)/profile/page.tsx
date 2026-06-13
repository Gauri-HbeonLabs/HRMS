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
import { useToast } from '@/hooks/use-toast'
import { User, Mail, Phone, MapPin, Building2, Calendar, Save, Hash } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ProfilePage() {
  const { employee } = useAuth()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
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
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        phone: employee.phone || '',
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
    }
  }, [employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    setLoading(true)
    const { error } = await supabase
      .from('employees')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        bank_name: formData.bank_name || null,
        bank_account: formData.bank_account || null,
        ifsc_code: formData.ifsc_code || null,
        pan_number: formData.pan_number || null,
        aadhaar_number: formData.aadhaar_number || null,
      })
      .eq('id', employee.id)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Profile updated successfully' })
    }
    setLoading(false)
  }

  if (!employee) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-slate-500">View and update your profile information</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-3xl font-bold text-white">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </div>
              <h2 className="mt-4 text-xl font-bold">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-slate-500">{employee.designation}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <Hash className="h-3 w-3" />
                {employee.employee_id}
              </div>
              <div className="mt-4 w-full space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4" />
                  {employee.department_id || 'No Department'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  Joined: {new Date(employee.date_of_joining).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="personal" className="space-y-4">
              <TabsList>
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="bank">Bank Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
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
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bank">
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bank_account">Account Number</Label>
                        <Input
                          id="bank_account"
                          value={formData.bank_account}
                          onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input
                          id="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pan_number">PAN Number</Label>
                        <Input
                          id="pan_number"
                          value={formData.pan_number}
                          onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                        <Input
                          id="aadhaar_number"
                          value={formData.aadhaar_number}
                          onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

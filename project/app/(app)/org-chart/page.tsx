// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Users, Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface OrgNode {
  id: string
  first_name: string
  last_name: string
  email: string
  designation: string | null
  role: string
  department_id: string | null
  manager_id: string | null
  avatar_url: string | null
  department: { name: string } | null
  reports: OrgNode[]
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgNode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    fetchOrgData()
  }, [])

  const fetchOrgData = async () => {
    setLoading(true)

    const { data: employees } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, designation, role, department_id, manager_id, avatar_url, department:departments!employees_department_id_fkey(name)')
      .eq('is_active', true)
      .order('role')

    if (employees) {
      // Build tree from flat list
      const map = new Map<string, OrgNode>()
      const roots: OrgNode[] = []

      for (const emp of employees) {
        map.set(emp.id, { ...emp, reports: [] })
      }

      for (const emp of employees) {
        const node = map.get(emp.id)!
        if (emp.manager_id && map.has(emp.manager_id)) {
          map.get(emp.manager_id)!.reports.push(node)
        } else {
          roots.push(node)
        }
      }

      // Sort: CEO first, then by role
      const roleOrder = { ceo: 0, hr: 1, manager: 2, employee: 3 }
      roots.sort((a, b) => (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4))

      setTree(roots)
    }
    setLoading(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ceo': return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' }
      case 'hr': return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' }
      case 'manager': return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' }
      default: return { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600' }
    }
  }

  const matchesSearch = (node: OrgNode): boolean => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      node.first_name.toLowerCase().includes(q) ||
      node.last_name.toLowerCase().includes(q) ||
      node.designation?.toLowerCase().includes(q) ||
      node.department?.name?.toLowerCase().includes(q) ||
      node.email.toLowerCase().includes(q)
    )
  }

  const renderNode = (node: OrgNode, depth = 0) => {
    const colors = getRoleColor(node.role)
    const isMatch = matchesSearch(node)
    const hasMatchingReports = node.reports.some(r => matchesSearch(r) || hasMatchingDescendants(r))

    function hasMatchingDescendants(n: OrgNode): boolean {
      return n.reports.some(r => matchesSearch(r) || hasMatchingDescendants(r))
    }

    if (search && !isMatch && !hasMatchingReports) return null

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div className={`${colors.bg} ${colors.border} ${isMatch ? 'ring-2 ring-blue-400' : ''} rounded-xl border-2 p-3 sm:p-4 transition-all hover:shadow-md min-w-[140px] sm:min-w-[180px]`}>
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 mb-2">
              <AvatarFallback className={`${colors.badge} text-sm font-bold`}>
                {node.first_name[0]}{node.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <p className={`font-semibold text-xs sm:text-sm ${colors.text} truncate max-w-full`}>
              {node.first_name} {node.last_name}
            </p>
            <Badge className={`${colors.badge} text-[10px] sm:text-xs mt-1 capitalize`}>
              {node.role}
            </Badge>
            {node.designation && (
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate max-w-full">{node.designation}</p>
            )}
            {node.department && (
              <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-full">{node.department.name}</p>
            )}
          </div>
        </div>

        {node.reports.length > 0 && (hasMatchingReports || !search) && (
          <>
            <div className="w-px h-6 sm:h-8 bg-slate-300" />
            <div className="relative flex flex-wrap justify-center gap-2 sm:gap-4">
              {node.reports.length > 1 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] h-px bg-slate-300" style={{ maxWidth: `${(node.reports.length - 1) * 200}px` }} />
              )}
              {node.reports.map((report) => (
                <div key={report.id} className="flex flex-col items-center pt-4">
                  <div className="w-px h-4 bg-slate-300 -mt-4" />
                  {renderNode(report, depth + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Organization Chart</h1>
          <p className="mt-1 text-slate-500">Visual reporting hierarchy</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border bg-white px-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(50, zoom - 15))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(150, zoom + 15))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-3">
          <span className="text-xs font-medium text-slate-500">Roles:</span>
          <Badge className="bg-amber-100 text-amber-700 text-xs">CEO</Badge>
          <Badge className="bg-blue-100 text-blue-700 text-xs">HR</Badge>
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Manager</Badge>
          <Badge className="bg-slate-100 text-slate-600 text-xs">Employee</Badge>
        </CardContent>
      </Card>

      {/* Org tree */}
      <div className="overflow-x-auto pb-8">
        <div className="flex justify-center min-w-fit" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
          <div className="flex flex-col items-center gap-0">
            {tree.map(node => renderNode(node))}
          </div>
        </div>
      </div>

      {tree.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-slate-500">No organizational data found</p>
            <p className="text-xs text-slate-400">Assign reporting managers to employees to build the org chart</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

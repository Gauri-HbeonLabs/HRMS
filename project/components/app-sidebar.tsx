'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CalendarDays,
  IndianRupee,
  FileText,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  User,
  Network,
  Target,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Employees',
    href: '/employees',
    icon: Users,
    roles: ['hr', 'manager', 'ceo'],
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    name: 'Leave Management',
    href: '/leaves',
    icon: CalendarDays,
  },
  {
    name: 'Payroll',
    href: '/payroll',
    icon: IndianRupee,
    roles: ['hr', 'manager', 'ceo'],
  },
  {
    name: 'My Payslips',
    href: '/payslips',
    icon: FileText,
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: User,
  },
  {
    name: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: ['hr', 'ceo'],
  },
  {
    name: 'Org Chart',
    href: '/org-chart',
    icon: Network,
  },
  {
    name: 'Performance',
    href: '/performance',
    icon: Target,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function AppSidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname()
  const { employee, signOut, isRole } = useAuth()

  const filteredNavigation = navigation.filter(
    (item) => !item.roles || item.roles.some((role) => isRole(role as any))
  )

  return (
    <aside className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:h-screen">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href="/dashboard" className="flex items-center gap-3 group flex-1 min-w-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg shadow-blue-500/20 transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/Hbeon_logo.png"
              alt="Hbeon Labs"
              width={32}
              height={32}
              className="object-contain p-0.5"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight leading-none">Hbeon Labs</span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase">HRMS Portal</span>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600/90 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white active:bg-white/10'
                )}
              >
                <item.icon className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                )} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3 safe-bottom">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-300 hover:bg-white/8 hover:text-white rounded-lg py-2.5 transition-all duration-200">
              <Avatar className="h-8 w-8 ring-2 ring-white/20">
                <AvatarImage src={employee?.avatar_url || ''} />
                <AvatarFallback className="bg-blue-600/80 text-xs text-white">
                  {employee?.first_name?.[0]}
                  {employee?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="text-sm font-medium truncate w-full">
                  {employee?.first_name} {employee?.last_name}
                </span>
                <span className="text-[11px] text-slate-400 capitalize">{employee?.role}</span>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

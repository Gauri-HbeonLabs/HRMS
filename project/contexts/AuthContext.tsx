'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Employee, UserRole } from '@/lib/database.types'
import { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  employee: Employee | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, employeeData: Partial<Employee>) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setEmployee(data)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setEmployee(data)
      } else {
        setEmployee(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, employeeData: Partial<Employee>) => {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) return { error }

    if (data.user) {
      if (!employeeData.employee_id) {
        return { error: new Error('Employee ID is required') as any }
      }
      const { error: insertError } = await supabase
        .from('employees')
        .insert({
          id: data.user.id,
          employee_id: employeeData.employee_id,
          email,
          first_name: employeeData.first_name || '',
          last_name: employeeData.last_name || '',
          role: employeeData.role || 'employee',
          date_of_joining: employeeData.date_of_joining || new Date().toISOString().split('T')[0],
          ...employeeData
        })

      if (insertError) return { error: insertError }

      // Auto-create leave balances for the new employee
      const { data: leaveTypes } = await supabase
        .from('leave_types')
        .select('id, days_allowed')
      if (leaveTypes && leaveTypes.length > 0) {
        const currentYear = new Date().getFullYear()
        const balances = leaveTypes.map(lt => ({
          employee_id: data.user!.id,
          leave_type_id: lt.id,
          year: currentYear,
          total_days: lt.days_allowed,
          used_days: 0,
        }))
        await supabase.from('leave_balances').insert(balances)
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setEmployee(null)
    setSession(null)
  }

  const isRole = (...roles: UserRole[]) => {
    return employee ? roles.includes(employee.role) : false
  }

  return (
    <AuthContext.Provider value={{ user, employee, session, loading, signIn, signUp, signOut, isRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

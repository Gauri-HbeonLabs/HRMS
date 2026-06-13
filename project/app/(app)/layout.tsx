'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import Image from 'next/image'

function PageLoader() {
  return (
    <div className="space-y-4 p-4 sm:p-6 animate-fade-in">
      <div className="space-y-2">
        <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-32 rounded-md" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="skeleton-shimmer h-32 w-full rounded-xl" />
        <div className="skeleton-shimmer h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg">
            <Image src="/Hbeon_logo.png" alt="Hbeon Labs" width={40} height={40} className="object-contain p-1" />
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-slate-200 border-t-blue-600" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white/80 backdrop-blur-lg px-4 shadow-sm lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 -ml-1">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 [&>button]:hidden">
            <AppSidebar onClose={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
            <Image src="/Hbeon_logo.png" alt="Hbeon Labs" width={28} height={28} className="object-contain p-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 leading-none">Hbeon Labs</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider">HRMS</span>
          </div>
        </div>
      </div>

      <main className="lg:ml-64">
        <Suspense key={pathname} fallback={<PageLoader />}>
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </Suspense>
      </main>
    </div>
  )
}

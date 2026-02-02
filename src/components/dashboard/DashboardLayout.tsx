'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import type { NavLink } from '@/components/dashboard/SidebarNav'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'operator' | 'admin' | '110-admin'
}

// Operator links - shared between operator, admin, and 110-admin
const operatorLinks: NavLink[] = [
  { href: '/operator/hendelser', label: 'Hendelser', icon: 'list' },
  { href: '/admin/ny-visning', label: 'Ny visning', icon: 'list' },
  { href: '/operator/hendelser/ny', label: 'Ny hendelse', icon: 'plus' },
  { href: '/admin/rapporter', label: 'Rapporter', icon: 'report' },
]

// Full admin links
const adminLinks: NavLink[] = [
  { href: '/admin/logg', label: 'Aktivitetslogg', icon: 'clock' },
  { href: '/admin/brukere', label: 'Brukere', icon: 'users' },
  { href: '/admin/brannvesen', label: 'Brannvesen', icon: 'truck' },
  { href: '/admin/sentraler', label: '110-sentraler', icon: 'phone' },
  { href: '/admin/fylker', label: 'Fylker', icon: 'map' },
  { href: '/admin/kommuner', label: 'Kommuner', icon: 'map' },
  { href: '/admin/kategorier', label: 'Kategorier', icon: 'tag' },
  { href: '/admin/medier', label: 'Mediehus', icon: 'press' },
  { href: '/admin/statistikk', label: 'Statistikk Varslinger', icon: 'chart' },
  { href: '/admin/innstillinger', label: 'Innstillinger', icon: 'settings' },
]

// 110-admin links - scoped admin with limited admin pages
const admin110Links: NavLink[] = [
  { href: '/admin/brukere', label: 'Brukere', icon: 'users' },
  { href: '/admin/brannvesen', label: 'Brannvesen', icon: 'truck' },
  { href: '/admin/sentraler', label: '110-sentraler', icon: 'phone' },
  { href: '/admin/statistikk', label: 'Statistikk Varslinger', icon: 'chart' },
]

// Operator-specific admin pages (scoped to their 110-sentral)
const operatorAdminLinks: NavLink[] = [
  { href: '/admin/statistikk', label: 'Statistikk Varslinger', icon: 'chart' },
  { href: '/admin/pressebrukere', label: 'Pressebrukere', icon: 'press' },
]

function getLinksForRole(effectiveRole: string): NavLink[] {
  if (effectiveRole === 'admin') {
    return [...operatorLinks, ...adminLinks, { href: '/admin/pressebrukere', label: 'Pressebrukere', icon: 'press' }]
  }
  if (effectiveRole === '110-admin') {
    return [...operatorLinks, ...admin110Links, { href: '/admin/pressebrukere', label: 'Pressebrukere', icon: 'press' }]
  }
  return [...operatorLinks, ...operatorAdminLinks]
}

function getRoleLabel(effectiveRole: string): string {
  if (effectiveRole === 'admin') return 'Administrator'
  if (effectiveRole === '110-admin') return '110-sentral Admin'
  return '110-Sentral CMS'
}

function getHeaderLabel(effectiveRole: string): string {
  if (effectiveRole === 'admin') return 'Admin'
  if (effectiveRole === '110-admin') return '110-Admin'
  return '110-Sentral'
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingPresseCount, setPendingPresseCount] = useState(0)
  const pathname = usePathname()
  const { user, rolle, loading } = useAuth()

  // Fetch pending presse_soknader count for badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const supabase = createClient()
        const { count, error } = await supabase
          .from('presse_soknader')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'venter')
        if (!error && count !== null) setPendingPresseCount(count)
      } catch {
        // RLS may block if not admin
      }
    }
    if (user) fetchPendingCount()
  }, [user])

  // Redirect to login if not authenticated (only after loading is done)
  if (!loading && !user && !rolle) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <p className="text-theme-secondary text-sm">Omdirigerer til innlogging...</p>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <p className="text-theme-secondary text-sm">Laster...</p>
      </div>
    )
  }

  // Determine effective role: use actual rolle from auth if available
  const effectiveRole = rolle || role

  // Presse users should use PresseLayout, redirect them
  if (effectiveRole === 'presse') {
    if (typeof window !== 'undefined') {
      window.location.href = '/presse/hendelser'
    }
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <p className="text-theme-secondary text-sm">Omdirigerer...</p>
      </div>
    )
  }

  const links = getLinksForRole(effectiveRole)
  const roleLabel = getRoleLabel(effectiveRole)
  const headerLabel = getHeaderLabel(effectiveRole)

  return (
    <div className="min-h-screen bg-theme">
      {/* Mobile header */}
      <DashboardHeader
        headerLabel={headerLabel}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex">
        {/* Sidebar */}
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          links={links}
          pathname={pathname}
          roleLabel={roleLabel}
          pendingPresseCount={pendingPresseCount}
        />

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-theme-overlay z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

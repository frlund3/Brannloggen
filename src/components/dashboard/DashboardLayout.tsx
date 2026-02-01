'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'
import { NotificationBell } from '@/components/ui/NotificationBell'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'operator' | 'admin' | '110-admin'
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, rolle, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()

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

  // Operator links - shared between operator, admin, and 110-admin
  const operatorLinks = [
    { href: '/operator/hendelser', label: 'Hendelser', icon: 'list' },
    { href: '/operator/hendelser/ny', label: 'Ny hendelse', icon: 'plus' },
    { href: '/admin/rapporter', label: 'Rapporter', icon: 'report' },
  ]

  // Full admin links
  const adminLinks = [
    { href: '/admin/ny-visning', label: 'Ny visning', icon: 'list' },
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
  const admin110Links = [
    { href: '/admin/ny-visning', label: 'Ny visning', icon: 'list' },
    { href: '/admin/logg', label: 'Aktivitetslogg', icon: 'clock' },
    { href: '/admin/brukere', label: 'Brukere', icon: 'users' },
    { href: '/admin/brannvesen', label: 'Brannvesen', icon: 'truck' },
    { href: '/admin/sentraler', label: '110-sentraler', icon: 'phone' },
    { href: '/admin/statistikk', label: 'Statistikk Varslinger', icon: 'chart' },
    { href: '/admin/innstillinger', label: 'Innstillinger', icon: 'settings' },
  ]

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

  const links = effectiveRole === 'admin'
    ? [...operatorLinks, ...adminLinks, { href: '/admin/pressebrukere', label: 'Pressebrukere', icon: 'press' }]
    : effectiveRole === '110-admin'
      ? [...operatorLinks, ...admin110Links, { href: '/admin/pressebrukere', label: 'Pressebrukere', icon: 'press' }]
      : [...operatorLinks]

  const roleLabel = effectiveRole === 'admin'
    ? 'Administrator'
    : effectiveRole === '110-admin'
      ? '110-sentral Admin'
      : '110-Sentral CMS'

  const headerLabel = effectiveRole === 'admin'
    ? 'Admin'
    : effectiveRole === '110-admin'
      ? '110-Admin'
      : '110-Sentral'

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'list':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      case 'plus':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      case 'users':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      case 'truck':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      case 'phone':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      case 'map':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      case 'tag':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      case 'chart':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      case 'clock':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      case 'settings':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      case 'report':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      case 'press':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-theme">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 bg-theme/95 backdrop-blur border-b border-theme px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -m-2 touch-manipulation">
            <svg className="w-6 h-6 text-theme" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-theme">{headerLabel}</span>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={toggleTheme} className="p-2 text-theme-secondary hover:text-theme touch-manipulation" title={theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}>
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <a href="/" className="py-2 px-3 -mr-3 text-sm text-blue-400 touch-manipulation">Forside</a>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:relative inset-y-0 left-0 z-50 w-64 min-h-screen bg-theme-sidebar border-r border-theme transform transition-transform lg:transform-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="p-4 border-b border-theme">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-theme">Brannloggen</h1>
                  <p className="text-xs text-theme-secondary">{roleLabel}</p>
                </div>
              </div>
              <a
                href="/"
                className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                Forside
              </a>
            </div>
          </div>

          <nav className="p-2 space-y-1 overflow-y-auto pb-52" style={{ maxHeight: 'calc(100vh - 70px)' }}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors touch-manipulation',
                  pathname === link.href
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-theme-secondary hover:text-theme hover:bg-theme-card'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {getIcon(link.icon)}
                </svg>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-theme">
            {/* Presse shortcut button */}
            <div className="px-3 pt-3 pb-2">
              <a
                href="/presse/hendelser"
                className="group flex items-center gap-3 px-4 py-3 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 dark:bg-gradient-to-r dark:from-cyan-600/20 dark:to-teal-600/20 dark:hover:from-cyan-600/30 dark:hover:to-teal-600/30 dark:border-cyan-500/30 dark:hover:border-cyan-400/50 rounded-xl transition-all"
              >
                <div className="w-9 h-9 bg-cyan-100 text-cyan-600 dark:bg-gradient-to-br dark:from-cyan-500 dark:to-teal-500 dark:text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-lg dark:shadow-cyan-500/20 dark:group-hover:shadow-cyan-500/40 transition-shadow">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 group-hover:text-cyan-900 dark:group-hover:text-cyan-200 transition-colors">Presseportal</span>
                  <span className="block text-[11px] text-cyan-600/70 dark:text-cyan-500/70">Åpne pressesiden</span>
                </div>
              </a>
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {(user?.email?.substring(0, 2) ?? 'U').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-theme truncate max-w-[160px]">{user?.email ?? 'Bruker'}</p>
                  <p className="text-xs text-theme-secondary">{roleLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <button onClick={toggleTheme} className="py-2 text-sm text-theme-secondary hover:text-theme touch-manipulation" title={theme === 'dark' ? 'Lyst tema' : 'Mørkt tema'}>
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                </button>
                <a href="/" className="py-2 text-sm text-theme-secondary hover:text-theme touch-manipulation">
                  Forside
                </a>
                <button
                  onClick={async () => {
                    // Log logout before signing out
                    await logActivity({ handling: 'utlogget', tabell: 'auth' })
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    localStorage.removeItem('brannloggen_user_rolle')
                    localStorage.removeItem('brannloggen_user_sentral_ids')
                    Object.keys(localStorage).forEach(key => {
                      if (key.startsWith('sb-')) localStorage.removeItem(key)
                    })
                    document.cookie.split(';').forEach(c => {
                      const name = c.split('=')[0].trim()
                      if (name.startsWith('sb-')) {
                        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
                      }
                    })
                    window.location.href = '/'
                  }}
                  className="py-2 text-sm text-red-400 hover:text-red-300 touch-manipulation"
                >
                  Logg ut
                </button>
              </div>
            </div>
          </div>
        </aside>

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

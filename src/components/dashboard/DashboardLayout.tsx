'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'operator' | 'admin' | 'presse'
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user, rolle, loading } = useAuth()

  // If rolle is cached in localStorage, show dashboard immediately
  // Don't wait for the potentially hanging getSession()
  const hasCachedRole = typeof window !== 'undefined' && !!localStorage.getItem('brannloggen_user_rolle')

  // Redirect to login if not authenticated (only after loading is done)
  if (!loading && !user && !hasCachedRole) {
    window.location.href = '/login'
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Omdirigerer til innlogging...</p>
      </div>
    )
  }

  // Show loading only if we have no cached role
  if (loading && !hasCachedRole) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Laster...</p>
      </div>
    )
  }

  // Operator links - shared between operator and admin
  const operatorLinks = [
    { href: '/operator/hendelser', label: 'Hendelser', icon: 'list' },
    { href: '/operator/hendelser/ny', label: 'Ny hendelse', icon: 'plus' },
  ]

  // Admin-only links
  const adminLinks = [
    { href: '/admin/brukere', label: 'Brukere', icon: 'users' },
    { href: '/admin/brannvesen', label: 'Brannvesen', icon: 'truck' },
    { href: '/admin/sentraler', label: '110-sentraler', icon: 'phone' },
    { href: '/admin/fylker', label: 'Fylker', icon: 'map' },
    { href: '/admin/kommuner', label: 'Kommuner', icon: 'map' },
    { href: '/admin/kategorier', label: 'Kategorier', icon: 'tag' },
    { href: '/admin/innstillinger', label: 'Innstillinger', icon: 'settings' },
  ]

  const presseLinks = [
    { href: '/presse/hendelser', label: 'Hendelser', icon: 'list' },
    { href: '/presse/innstillinger', label: 'Varsler', icon: 'settings' },
  ]

  // Admin sees operator + admin links, operator sees only operator links
  const effectiveRole = rolle || role
  const links = effectiveRole === 'admin'
    ? [...operatorLinks, ...adminLinks]
    : effectiveRole === 'presse'
    ? presseLinks
    : operatorLinks

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
      case 'settings':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a] px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">
            {role === 'admin' ? 'Admin' : role === 'presse' ? 'Presse' : '110-Sentral'}
          </span>
          <a href="/" className="text-sm text-blue-400">Forside</a>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111] border-r border-[#2a2a2a] transform transition-transform lg:transform-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Brannloggen</h1>
                <p className="text-xs text-gray-400">
                  {role === 'admin' ? 'Administrator' : role === 'presse' ? 'Pressekonto' : '110-Sentral CMS'}
                </p>
              </div>
            </div>
          </div>

          <nav className="p-2 space-y-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  pathname === link.href
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {getIcon(link.icon)}
                </svg>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2a2a2a]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">
                  {(user?.email?.substring(0, 2) ?? 'U').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-white truncate max-w-[160px]">{user?.email ?? 'Bruker'}</p>
                <p className="text-xs text-gray-400">
                  {role === 'admin' ? 'Administrator' : role === 'presse' ? 'Presse' : 'Operatør'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="text-sm text-gray-400 hover:text-white">
                Forside
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem('brannloggen_user_rolle')
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
                className="text-sm text-red-400 hover:text-red-300"
              >
                Logg ut
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
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

'use client'

import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
import { SidebarNav, type NavLink } from '@/components/dashboard/SidebarNav'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'

interface DashboardSidebarProps {
  open: boolean
  onClose: () => void
  links: NavLink[]
  pathname: string
  roleLabel: string
  pendingPresseCount: number
}

export function DashboardSidebar({ open, onClose, links, pathname, roleLabel, pendingPresseCount }: DashboardSidebarProps) {
  const { user } = useAuth()

  return (
    <aside
      className={cn(
        'fixed lg:relative inset-y-0 left-0 z-50 w-64 min-h-screen bg-theme-sidebar border-r border-theme transform transition-transform lg:transform-none',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Brand */}
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

      {/* User info & actions */}
      <div className="border-b border-theme">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {(user?.email?.substring(0, 2) ?? 'U').toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-theme truncate">{user?.email ?? 'Bruker'}</p>
              <p className="text-xs text-theme-secondary">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a href="/" className="py-1 text-sm text-theme-secondary hover:text-theme touch-manipulation">Forside</a>
            <button
              onClick={async () => {
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
              className="py-1 text-sm text-red-400 hover:text-red-300 touch-manipulation"
            >
              Logg ut
            </button>
          </div>
        </div>

        {/* Presse shortcut */}
        <div className="px-3 pb-3">
          <a
            href="/presse/hendelser"
            className="group flex items-center gap-3 px-4 py-3 bg-cyan-50 dark:bg-transparent border border-cyan-200 hover:bg-cyan-100 dark:bg-gradient-to-r dark:from-cyan-600/20 dark:to-teal-600/20 dark:hover:from-cyan-600/30 dark:hover:to-teal-600/30 dark:border-cyan-500/30 dark:hover:border-cyan-400/50 rounded-xl transition-all"
          >
            <div className="w-9 h-9 bg-cyan-100 dark:bg-transparent text-cyan-600 dark:bg-gradient-to-br dark:from-cyan-500 dark:to-teal-500 dark:text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-lg dark:shadow-cyan-500/20 dark:group-hover:shadow-cyan-500/40 transition-shadow">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-cyan-300 group-hover:text-black dark:group-hover:text-cyan-200 transition-colors">Presseportal</span>
              <span className="block text-[11px] text-gray-600 dark:text-cyan-500/70">Åpne pressesiden</span>
            </div>
          </a>
        </div>
      </div>

      <SidebarNav
        links={links}
        pathname={pathname}
        pendingPresseCount={pendingPresseCount}
        onLinkClick={onClose}
      />
    </aside>
  )
}

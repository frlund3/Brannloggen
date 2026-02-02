'use client'

import { NotificationBell } from '@/components/ui/NotificationBell'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'

interface DashboardHeaderProps {
  headerLabel: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function DashboardHeader({ headerLabel, sidebarOpen, onToggleSidebar }: DashboardHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-theme/95 backdrop-blur border-b border-theme px-4 py-3">
      <div className="flex items-center justify-between">
        <button onClick={onToggleSidebar} className="p-2 -m-2 touch-manipulation" aria-label={sidebarOpen ? 'Lukk meny' : 'Åpne meny'}>
          <svg className="w-6 h-6 text-theme" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-theme">{headerLabel}</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <a href="/" className="py-2 text-sm text-blue-400 touch-manipulation">Forside</a>
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
            className="py-2 -mr-3 text-sm text-red-400 touch-manipulation"
          >
            Logg ut
          </button>
        </div>
      </div>
    </header>
  )
}

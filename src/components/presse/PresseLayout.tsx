'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'
import { NotificationBell } from '@/components/ui/NotificationBell'

const tabs = [
  { href: '/presse/hendelser', label: 'Hendelser' },
  { href: '/presse/innstillinger', label: 'Varsler' },
]

export function PresseLayout({ children }: { children: React.ReactNode }) {
  const { user, rolle, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const hasAdminAccess = rolle === 'admin' || rolle === '110-admin' || rolle === 'operator'

  if (!loading && !user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <p className="text-theme-secondary text-sm">Omdirigerer til innlogging...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <p className="text-theme-secondary text-sm">Laster...</p>
      </div>
    )
  }

  const handleLogout = () => {
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
    // Log logout before signing out
    logActivity({ handling: 'utlogget', tabell: 'auth' })
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      window.location.href = '/'
    })
  }

  return (
    <div className="min-h-screen bg-theme">
      {/* Top banner - PRESSE portal identifier */}
      <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-500">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            <span className="text-sm font-bold text-white tracking-wide uppercase">Presseportal</span>
            <span className="text-[10px] text-white/70 hidden sm:inline">— Kun for akkrediterte medier</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-white/80 hover:text-white transition-colors">Forside</a>
            {hasAdminAccess && (
              <a href="/operator/hendelser" className="text-xs text-white bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors">
                {rolle === 'admin' ? 'Admin' : rolle === '110-admin' ? '110-Admin' : 'CMS'}
              </a>
            )}
            <button onClick={handleLogout} className="text-xs text-white/70 hover:text-white transition-colors">Logg ut</button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-[#0f1114]/95 backdrop-blur border-b border-cyan-500/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="Brannloggen" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-bold text-theme">Brannloggen</span>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded uppercase tracking-wider">Presse</span>
          </div>
          <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-theme-card-hover transition-colors text-theme-secondary"
            title={theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-6">
            {tabs.map(tab => (
              <a
                key={tab.href}
                href={tab.href}
                className={cn(
                  'py-2.5 text-sm border-b-2 -mb-px transition-colors',
                  pathname === tab.href
                    ? 'border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-400'
                    : 'border-transparent text-theme-secondary hover:text-theme'
                )}
              >
                {tab.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  )
}

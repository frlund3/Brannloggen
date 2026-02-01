'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const tabs = [
  { href: '/presse/hendelser', label: 'Hendelser' },
  { href: '/presse/innstillinger', label: 'Varsler' },
]

export function PresseLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  if (!loading && !user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Omdirigerer til innlogging...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Laster...</p>
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
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      window.location.href = '/'
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="Brannloggen" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-bold text-white">Brannloggen</span>
            <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Presse</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-blue-400 hover:text-blue-300">Forside</a>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Logg ut</button>
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
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-white'
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

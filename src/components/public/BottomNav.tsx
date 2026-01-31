'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface BottomNavProps {
  activeTab: 'følger' | 'alle' | 'innstillinger'
  onTabChange: (tab: 'følger' | 'alle' | 'innstillinger') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [rolle, setRolle] = useState<string | null>(null)

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('brukerprofiler')
        .select('rolle')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (profile) {
        setRolle(profile.rolle)
      }
    }
    checkRole()
  }, [])

  const getDashboardLink = () => {
    if (rolle === 'admin') return '/admin/brukere'
    if (rolle === 'operator') return '/operator/hendelser'
    if (rolle === 'presse') return '/presse/hendelser'
    return null
  }

  const getDashboardLabel = () => {
    if (rolle === 'admin') return 'Admin'
    if (rolle === 'operator') return '110-Sentral'
    if (rolle === 'presse') return 'Presse'
    return null
  }

  const dashboardLink = getDashboardLink()
  const dashboardLabel = getDashboardLabel()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#2a2a2a] z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        <button
          onClick={() => onTabChange('følger')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1',
            activeTab === 'følger' ? 'text-blue-400' : 'text-gray-500'
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs">Jeg følger</span>
        </button>

        <button
          onClick={() => onTabChange('alle')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1',
            activeTab === 'alle' ? 'text-blue-400' : 'text-gray-500'
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-xs">Alle</span>
        </button>

        <button
          onClick={() => onTabChange('innstillinger')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1',
            activeTab === 'innstillinger' ? 'text-blue-400' : 'text-gray-500'
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Innstillinger</span>
        </button>

        {dashboardLink ? (
          <a
            href={dashboardLink}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1',
              rolle === 'admin' ? 'text-purple-400' : rolle === 'presse' ? 'text-cyan-400' : 'text-red-400'
            )}
          >
            {rolle === 'admin' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : rolle === 'presse' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            )}
            <span className="text-xs">{dashboardLabel}</span>
          </a>
        ) : (
          <a
            href="/login"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">Logg inn</span>
          </a>
        )}
      </div>
    </nav>
  )
}

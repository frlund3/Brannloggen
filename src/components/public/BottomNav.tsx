'use client'

import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'

interface BottomNavProps {
  activeTab: 'følger' | 'alle' | 'innstillinger'
  onTabChange: (tab: 'følger' | 'alle' | 'innstillinger') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { rolle } = useAuth()

  const getDashboardLink = () => {
    if (rolle === 'admin') return '/operator/hendelser'
    if (rolle === '110-admin') return '/operator/hendelser'
    if (rolle === 'operator') return '/operator/hendelser'
    if (rolle === 'presse') return '/presse/hendelser'
    return null
  }

  const getDashboardLabel = () => {
    if (rolle === 'admin') return 'Dashboard'
    if (rolle === '110-admin') return '110-Admin'
    if (rolle === 'operator') return '110-Sentral'
    if (rolle === 'presse') return 'Presse'
    return null
  }

  const dashboardLink = getDashboardLink()
  const dashboardLabel = getDashboardLabel()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-theme border-t border-theme z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        <button
          onClick={() => onTabChange('følger')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1',
            activeTab === 'følger' ? 'text-blue-400' : 'text-theme-muted'
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
            activeTab === 'alle' ? 'text-blue-400' : 'text-theme-muted'
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
            activeTab === 'innstillinger' ? 'text-blue-400' : 'text-theme-muted'
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Innstillinger</span>
        </button>

        {dashboardLink && (
          <a
            href={dashboardLink}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1',
              rolle === 'admin' ? 'text-purple-400' : rolle === '110-admin' ? 'text-orange-400' : rolle === 'presse' ? 'text-cyan-400' : 'text-red-400'
            )}
          >
            {rolle === 'admin' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : rolle === '110-admin' ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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
        )}
      </div>
    </nav>
  )
}

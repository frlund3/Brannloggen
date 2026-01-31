'use client'

import { cn } from '@/lib/utils'

interface BottomNavProps {
  activeTab: 'følger' | 'alle' | 'innstillinger'
  onTabChange: (tab: 'følger' | 'alle' | 'innstillinger') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#2a2a2a] z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        <button
          onClick={() => onTabChange('følger')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1',
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
            'flex flex-col items-center gap-0.5 px-4 py-1',
            activeTab === 'alle' ? 'text-blue-400' : 'text-gray-500'
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-xs">Alle meldinger</span>
        </button>

        <button
          onClick={() => onTabChange('innstillinger')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1',
            activeTab === 'innstillinger' ? 'text-blue-400' : 'text-gray-500'
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Innstillinger</span>
        </button>
      </div>
    </nav>
  )
}

'use client'

import { useRef, useEffect } from 'react'
import { Bell, BellRing, Volume2, VolumeX } from 'lucide-react'
import { useNotificationBell } from '@/hooks/useNotificationBell'
import { formatTimeAgo } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { SeverityDot } from '@/components/ui/SeverityDot'

export function NotificationBell() {
  const {
    items,
    unreadCount,
    isOpen,
    setIsOpen,
    markAllRead,
    soundEnabled,
    setSoundEnabled,
    lastSeen,
  } = useNotificationBell()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, setIsOpen])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, setIsOpen])

  // Close on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname, setIsOpen])

  const lastSeenTime = new Date(lastSeen).getTime()

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-theme-card transition-colors"
        aria-label="Varsler"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-theme" />
        ) : (
          <Bell className="w-5 h-5 text-theme-secondary" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-theme-card border border-theme rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
            <h3 className="text-sm font-bold text-theme">Varsler</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded hover:bg-theme transition-colors"
                title={soundEnabled ? 'Skru av lyd' : 'Skru på lyd'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-theme-secondary" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-theme-muted" />
                )}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                >
                  Merk alle lest
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-theme-muted">
                Ingen varsler ennå
              </div>
            ) : (
              items.map((item) => {
                const isUnread = new Date(item.tidspunkt).getTime() > lastSeenTime
                return (
                  <div
                    key={item.id}
                    className={`px-4 py-3 border-b border-theme last:border-b-0 transition-colors ${
                      isUnread ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.type === 'hendelse'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {item.type === 'hendelse' ? 'Ny hendelse' : 'Oppdatering'}
                      </span>
                      <SeverityDot severity={item.alvorlighetsgrad} />
                      <span className={`text-[10px] ml-auto ${
                        item.status === 'pågår' ? 'text-red-400' : 'text-theme-muted'
                      }`}>
                        {item.status === 'pågår' ? 'Pågår' : 'Avsluttet'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-theme truncate">{item.tittel}</p>
                    <p className="text-xs text-theme-secondary truncate">{item.tekst}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-theme-muted">{item.sted}</span>
                      <span className="text-[10px] text-theme-dim ml-auto">{formatTimeAgo(item.tidspunkt)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

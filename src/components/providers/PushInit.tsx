'use client'

import { useEffect } from 'react'
import { setupPushListeners, clearBadge, setBadgeCount, isNative } from '@/lib/capacitor'

const UNREAD_KEY = 'brannloggen_unread_count'

function getUnreadCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(UNREAD_KEY) || '0', 10)
}

function setUnreadCount(count: number) {
  localStorage.setItem(UNREAD_KEY, String(count))
  setBadgeCount(count)
}

/**
 * Initializes push notification listeners and badge management.
 * - Clears badge when app comes to foreground
 * - Increments badge count when notification received in foreground
 * - Handles notification tap to navigate to relevant hendelse
 */
export function PushInit() {
  useEffect(() => {
    // Set up native push listeners
    setupPushListeners(
      // Notification received while app is in foreground
      (notification) => {
        const count = getUnreadCount() + 1
        setUnreadCount(count)
        console.log('[Push] Notification received in foreground:', notification)
      },
      // User tapped a notification
      (action) => {
        const data = (action as { notification?: { data?: { url?: string } } })?.notification?.data
        if (data?.url) {
          window.location.href = data.url
        }
        // Clear badge when user interacts with notification
        setUnreadCount(0)
        clearBadge()
      },
    )

    // Clear badge when app comes to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setUnreadCount(0)
        clearBadge()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // On native, also listen for app resume
    if (isNative()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            setUnreadCount(0)
            clearBadge()
          }
        })
      }).catch((e) => {
        console.warn('[PushInit] Kunne ikke initialisere Capacitor App-lytter:', e)
      })
    }

    // Clear badge on initial load
    clearBadge()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return null
}

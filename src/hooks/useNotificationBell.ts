'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useHendelser, useSentraler, type Hendelse } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'

const PREFS_KEY = 'brannloggen_push_prefs'
const LAST_SEEN_KEY = 'brannloggen_bell_last_seen'
const SOUND_KEY = 'brannloggen_bell_sound'

interface PushPrefs {
  pushEnabled: boolean
  onlyOngoing: boolean
  sentraler: string[]
  fylker: string[]
  kategorier: string[]
  brannvesen: string[]
}

const defaultPrefs: PushPrefs = {
  pushEnabled: false,
  onlyOngoing: false,
  sentraler: [],
  fylker: [],
  kategorier: [],
  brannvesen: [],
}

export interface NotificationItem {
  id: string
  type: 'hendelse' | 'oppdatering'
  hendelse_id: string
  tittel: string
  tekst: string
  sted: string
  status: string
  alvorlighetsgrad: string
  kategori_id: string
  tidspunkt: string
}

// Pre-load notification sound for instant playback
let notificationAudio: HTMLAudioElement | null = null

if (typeof window !== 'undefined') {
  notificationAudio = new Audio('/notification.wav')
  notificationAudio.volume = 0.8
  notificationAudio.load()
}

function playNotificationSound() {
  try {
    if (notificationAudio) {
      notificationAudio.currentTime = 0
      notificationAudio.play().catch(() => { /* autoplay blocked */ })
    }
  } catch {
    // Audio not available
  }
}

function getPrefs(): PushPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) }
  } catch (e) {
    console.warn('[NotificationBell] Kunne ikke lese varslingspreferanser fra localStorage:', e)
  }
  return defaultPrefs
}

function getLastSeen(): string {
  try {
    return localStorage.getItem(LAST_SEEN_KEY) || new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function getSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_KEY)
    return val === null ? true : val === 'true'
  } catch {
    return true
  }
}

export function useNotificationBell() {
  const { data: hendelser, refetch } = useHendelser({ excludeDeactivated: true })
  const { data: sentraler } = useSentraler()
  useRealtimeHendelser(refetch)

  const [isOpen, setIsOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState<string>(() => getLastSeen())
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => getSoundEnabled())
  const prevUnreadRef = useRef(0)
  const initializedRef = useRef(false)

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    try { localStorage.setItem(SOUND_KEY, String(enabled)) } catch (e) { console.warn('[NotificationBell] Kunne ikke lagre lydinnstilling:', e) }
  }, [])

  // Build notification items from hendelser
  const items = useMemo(() => {
    const prefs = getPrefs()
    let filtered = [...hendelser]

    // Filter by preferences (same logic as page.tsx følgerHendelser)
    if (prefs.sentraler.length > 0) {
      const sentralBv = prefs.sentraler.flatMap(sId => {
        const s = sentraler.find(x => x.id === sId)
        return s ? s.brannvesen_ids : []
      })
      filtered = filtered.filter(h => sentralBv.includes(h.brannvesen_id))
    }
    if (prefs.fylker.length > 0) {
      filtered = filtered.filter(h => prefs.fylker.includes(h.fylke_id))
    }
    if (prefs.brannvesen.length > 0) {
      filtered = filtered.filter(h => prefs.brannvesen.includes(h.brannvesen_id))
    }
    if (prefs.kategorier.length > 0) {
      filtered = filtered.filter(h => prefs.kategorier.includes(h.kategori_id))
    }
    if (prefs.onlyOngoing) {
      filtered = filtered.filter(h => h.status === 'pågår')
    }

    const result: NotificationItem[] = []

    for (const h of filtered) {
      result.push({
        id: `h-${h.id}`,
        type: 'hendelse',
        hendelse_id: h.id,
        tittel: h.tittel,
        tekst: h.beskrivelse,
        sted: h.sted,
        status: h.status,
        alvorlighetsgrad: h.alvorlighetsgrad,
        kategori_id: h.kategori_id,
        tidspunkt: h.opprettet_tidspunkt,
      })

      const activeUpdates = (h.oppdateringer || []).filter(u => !u.deaktivert)
      for (const u of activeUpdates) {
        result.push({
          id: `u-${u.id}`,
          type: 'oppdatering',
          hendelse_id: h.id,
          tittel: h.tittel,
          tekst: u.tekst,
          sted: h.sted,
          status: h.status,
          alvorlighetsgrad: h.alvorlighetsgrad,
          kategori_id: h.kategori_id,
          tidspunkt: u.opprettet_tidspunkt,
        })
      }
    }

    result.sort((a, b) => new Date(b.tidspunkt).getTime() - new Date(a.tidspunkt).getTime())
    return result.slice(0, 50)
  }, [hendelser, sentraler])

  // Compute unread count
  const unreadCount = useMemo(() => {
    const lastSeenTime = new Date(lastSeen).getTime()
    return items.filter(item => new Date(item.tidspunkt).getTime() > lastSeenTime).length
  }, [items, lastSeen])

  // Play sound when unread count increases (but not on initial load)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      prevUnreadRef.current = unreadCount
      return
    }
    if (unreadCount > prevUnreadRef.current && soundEnabled) {
      playNotificationSound()
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, soundEnabled])

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString()
    setLastSeen(now)
    try { localStorage.setItem(LAST_SEEN_KEY, now) } catch (e) { console.warn('[NotificationBell] Kunne ikke lagre sist-sett tidspunkt:', e) }
  }, [])

  // No longer auto-marking as read when opening — user must press "Merk alle lest"

  return {
    items,
    unreadCount,
    isOpen,
    setIsOpen,
    markAllRead,
    soundEnabled,
    setSoundEnabled,
    lastSeen,
  }
}

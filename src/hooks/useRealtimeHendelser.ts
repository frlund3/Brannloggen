'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to Supabase Realtime changes on hendelser and hendelsesoppdateringer.
 * Calls `onUpdate` whenever a row is inserted, updated, or deleted.
 * Debounces rapid changes to avoid excessive refetches.
 */
export function useRealtimeHendelser(onUpdate: () => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onUpdate)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  callbackRef.current = onUpdate

  const handleChange = useCallback(() => {
    // Debounce: wait 500ms after last change before refetching
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      callbackRef.current()
    }, 500)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('hendelser-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hendelser' },
        handleChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hendelsesoppdateringer' },
        handleChange,
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [handleChange])
}

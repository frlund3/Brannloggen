'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to Supabase Realtime changes on hendelser and hendelsesoppdateringer.
 * Calls `onUpdate` whenever a row is inserted, updated, or deleted.
 * This triggers a refetch of the data rather than trying to patch state locally.
 */
export function useRealtimeHendelser(onUpdate: () => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  const handleChange = useCallback(() => {
    callbackRef.current()
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
      supabase.removeChannel(channel)
    }
  }, [handleChange])
}

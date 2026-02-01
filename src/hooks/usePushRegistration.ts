'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerPush, getPlatform } from '@/lib/capacitor'

const DEVICE_ID_KEY = 'brannloggen_device_id'

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export interface PushPreferences {
  sentral_ids: string[]
  fylke_ids: string[]
  kategori_ids: string[]
  kun_pågående: boolean
}

/**
 * Hook for registering push notifications and saving preferences to Supabase.
 * Works on iOS, Android (via Capacitor) and Web (via Web Push API).
 */
export function usePushRegistration() {
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Register for push notifications and save/update preferences in push_abonnenter.
   */
  const register = useCallback(async (prefs: PushPreferences) => {
    setRegistering(true)
    setError(null)

    try {
      const token = await registerPush()
      if (!token) {
        setError('Push-tillatelse ble ikke gitt eller er ikke tilgjengelig.')
        setRegistering(false)
        return false
      }

      const deviceId = getOrCreateDeviceId()
      const platform = getPlatform()
      const supabase = createClient()

      // Upsert push subscriber (device_id is the unique identifier)
      const { error: dbError } = await (supabase.from('push_abonnenter') as ReturnType<typeof supabase.from>)
        .upsert(
          {
            id: deviceId,
            device_id: deviceId,
            platform,
            push_token: token,
            push_aktiv: true,
            sentral_ids: prefs.sentral_ids,
            fylke_ids: prefs.fylke_ids,
            kategori_ids: prefs.kategori_ids,
            kun_pågående: prefs.kun_pågående,
            sist_aktiv: new Date().toISOString(),
          },
          { onConflict: 'device_id' },
        )

      if (dbError) {
        setError(dbError.message)
        setRegistering(false)
        return false
      }

      setRegistered(true)
      setRegistering(false)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil ved push-registrering')
      setRegistering(false)
      return false
    }
  }, [])

  /**
   * Unregister push notifications for this device.
   */
  const unregister = useCallback(async () => {
    const deviceId = getOrCreateDeviceId()
    const supabase = createClient()

    await (supabase.from('push_abonnenter') as ReturnType<typeof supabase.from>)
      .update({ push_aktiv: false } as Record<string, unknown>)
      .eq('device_id', deviceId)

    setRegistered(false)
  }, [])

  return { register, unregister, registering, registered, error }
}

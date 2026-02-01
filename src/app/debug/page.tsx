'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'

export default function DebugPage() {
  const { user, rolle, loading: authLoading } = useAuth()
  const [log, setLog] = useState<string[]>([])
  const [authorized, setAuthorized] = useState(false)

  const addLog = (msg: string) => {
    setLog(prev => [...prev, msg])
  }

  // Only allow admin access
  useEffect(() => {
    if (authLoading) return
    if (!user || rolle !== 'admin') {
      setAuthorized(false)
      return
    }
    setAuthorized(true)
  }, [user, rolle, authLoading])

  useEffect(() => {
    if (!authorized) return

    const run = async () => {
      addLog('=== LOCALSTORAGE ===')
      const keys = Object.keys(localStorage)
      addLog(`Keys (${keys.length}): ${keys.join(', ')}`)

      const cachedRolle = localStorage.getItem('brannloggen_user_rolle')
      addLog(`Cached rolle: ${cachedRolle || 'INGEN'}`)

      const sbKeys = keys.filter(k => k.startsWith('sb-'))
      sbKeys.forEach(k => {
        const val = localStorage.getItem(k)
        addLog(`${k}: ${val ? val.substring(0, 80) + '...' : 'null'}`)
      })

      addLog('')
      addLog('=== SUPABASE AUTH ===')
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        addLog(`SESSION ERROR: ${sessionError.message}`)
      } else if (!session) {
        addLog('SESSION: null (ikke innlogget)')
      } else {
        addLog(`SESSION: ${session.user.email}`)
        addLog(`USER ID: ${session.user.id}`)
        addLog(`TOKEN expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`)
      }

      addLog('')
      addLog('=== BRUKERPROFILER QUERY ===')
      if (session) {
        const { data: profile, error: profileError, status } = await supabase
          .from('brukerprofiler')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        addLog(`HTTP: ${status}`)
        if (profileError) {
          addLog(`ERROR: ${profileError.message}`)
          addLog(`CODE: ${profileError.code}`)
          addLog(`DETAILS: ${profileError.details}`)
          addLog(`HINT: ${profileError.hint}`)
        } else if (!profile) {
          addLog('RESULT: null (ingen profil / RLS blokkerer)')
        } else {
          const p = profile as Record<string, unknown>
          addLog(`ROLLE: ${p.rolle}`)
          addLog(`NAVN: ${p.fullt_navn}`)
          addLog(`AKTIV: ${p.aktiv}`)
          addLog(`USER_ID: ${p.user_id}`)
        }
      }
    }

    run()
  }, [authorized])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400 text-sm">Sjekker tilgang...</p>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">Kun tilgjengelig for administratorer.</p>
          <a href="/login" className="px-4 py-2 bg-blue-600 text-white text-sm rounded">
            Logg inn
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <h1 className="text-lg font-bold text-white mb-4">Debug (Admin)</h1>

      <div className="space-y-0.5 mb-6">
        {log.map((line, i) => (
          <p key={i} className={`text-xs font-mono ${
            line.includes('ERROR') || line.includes('null')
              ? 'text-red-400'
              : line.includes('ROLLE:') || line.includes('SESSION:')
              ? 'text-green-400'
              : line.startsWith('===')
              ? 'text-yellow-300 font-bold mt-2'
              : 'text-gray-400'
          }`}>
            {line}
          </p>
        ))}
      </div>

      <div className="flex gap-2 mt-4 border-t border-gray-700 pt-4">
        <a href="/" className="px-4 py-2 bg-blue-600 text-white text-sm rounded text-center">
          Forsiden
        </a>
      </div>
    </div>
  )
}

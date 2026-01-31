'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLog(prev => [...prev, msg])
  }

  useEffect(() => {
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

          // Count all visible rows
          const { count } = await supabase
            .from('brukerprofiler')
            .select('*', { count: 'exact', head: true })
          addLog(`Synlige rader: ${count}`)
        } else {
          const p = profile as Record<string, unknown>
          addLog(`ROLLE: ${p.rolle}`)
          addLog(`NAVN: ${p.fullt_navn}`)
          addLog(`AKTIV: ${p.aktiv}`)
          addLog(`USER_ID: ${p.user_id}`)
        }
      }

      addLog('')
      addLog('=== FIX: CACHE ROLLE ===')
      if (session && !cachedRolle) {
        // Try to get rolle and cache it
        const { data: profile } = await supabase
          .from('brukerprofiler')
          .select('rolle')
          .eq('user_id', session.user.id)
          .maybeSingle()
        const rolle = (profile as { rolle?: string } | null)?.rolle
        if (rolle) {
          localStorage.setItem('brannloggen_user_rolle', rolle)
          addLog(`CACHED rolle: ${rolle} -> Reload page!`)
        } else {
          addLog('Kunne ikke hente rolle fra DB')
          addLog('Kjør denne SQL i Supabase SQL Editor:')
          addLog('')
          addLog('DROP POLICY IF EXISTS "brukerprofiler_select" ON brukerprofiler;')
          addLog('CREATE POLICY "brukerprofiler_select" ON brukerprofiler')
          addLog('  FOR SELECT USING (true);')
          addLog('')
          addLog('Eller manuelt sett rolle:')
        }
      } else if (cachedRolle) {
        addLog(`Rolle allerede cachet: ${cachedRolle}`)
      }
    }

    run()
  }, [])

  const setRolleManually = (rolle: string) => {
    localStorage.setItem('brannloggen_user_rolle', rolle)
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <h1 className="text-lg font-bold text-white mb-4">Debug</h1>

      <div className="space-y-0.5 mb-6">
        {log.map((line, i) => (
          <p key={i} className={`text-xs font-mono ${
            line.includes('ERROR') || line.includes('null')
              ? 'text-red-400'
              : line.includes('CACHED') || line.includes('ROLLE:') || line.includes('SESSION:')
              ? 'text-green-400'
              : line.startsWith('===')
              ? 'text-yellow-300 font-bold mt-2'
              : 'text-gray-400'
          }`}>
            {line}
          </p>
        ))}
      </div>

      <div className="space-y-2 border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-400">Sett rolle manuelt:</p>
        <div className="flex gap-2">
          <button
            onClick={() => setRolleManually('admin')}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded"
          >
            Admin
          </button>
          <button
            onClick={() => setRolleManually('operator')}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded"
          >
            Operatør
          </button>
          <button
            onClick={() => setRolleManually('presse')}
            className="px-4 py-2 bg-cyan-600 text-white text-sm rounded"
          >
            Presse
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              localStorage.clear()
              window.location.href = '/'
            }}
            className="px-4 py-2 bg-gray-700 text-white text-sm rounded"
          >
            Logg ut (tøm alt)
          </button>
          <a href="/" className="px-4 py-2 bg-blue-600 text-white text-sm rounded text-center">
            Forsiden
          </a>
        </div>
      </div>
    </div>
  )
}

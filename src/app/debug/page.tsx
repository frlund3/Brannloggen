'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()

      addLog('Henter sesjon...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        addLog(`Sesjon-feil: ${sessionError.message}`)
        return
      }

      if (!session) {
        addLog('Ingen sesjon - ikke innlogget')
        addLog('Prøver å logge inn...')

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: 'frank.lunde1981@gmail.com',
          password: 'Flomlys@2025',
        })

        if (authError) {
          addLog(`Login-feil: ${authError.message}`)
          return
        }

        addLog(`Innlogget som: ${authData.user?.email}`)
        addLog(`User ID: ${authData.user?.id}`)

        // Fetch profile
        await checkProfile(supabase, authData.user!.id)
      } else {
        addLog(`Allerede innlogget: ${session.user.email}`)
        addLog(`User ID: ${session.user.id}`)
        addLog(`Token utløper: ${new Date(session.expires_at! * 1000).toLocaleString()}`)

        await checkProfile(supabase, session.user.id)
      }
    }

    const checkProfile = async (supabase: ReturnType<typeof createClient>, userId: string) => {
      addLog('---')
      addLog(`Henter profil for user_id: ${userId}`)

      const { data: profile, error: profileError, status, statusText } = await supabase
        .from('brukerprofiler')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      addLog(`HTTP status: ${status} ${statusText}`)

      if (profileError) {
        addLog(`Profil-feil: ${profileError.message}`)
        addLog(`Feilkode: ${profileError.code}`)
        addLog(`Detaljer: ${profileError.details}`)
        addLog(`Hint: ${profileError.hint}`)
      } else if (!profile) {
        addLog('Ingen profil funnet (null)')
        addLog('Prøver uten RLS (teller alle rader)...')

        const { count, error: countError } = await supabase
          .from('brukerprofiler')
          .select('*', { count: 'exact', head: true })

        if (countError) {
          addLog(`Count-feil: ${countError.message}`)
        } else {
          addLog(`Antall profiler synlig via RLS: ${count}`)
        }
      } else {
        const p = profile as Record<string, unknown>
        addLog('Profil funnet!')
        addLog(`Rolle: ${p.rolle}`)
        addLog(`Navn: ${p.fullt_navn}`)
        addLog(`Aktiv: ${p.aktiv}`)
        addLog(`Brannvesen: ${p.brannvesen_id || 'ingen'}`)
        addLog(`Profil user_id: ${p.user_id}`)
      }

      addLog('---')
      addLog('Prøver RPC ping...')
      const { error: rpcError } = await supabase.rpc('log_audit' as never)
      addLog(rpcError ? `RPC: ${rpcError.message}` : 'RPC: OK')
    }

    run()
  }, [])

  return (
    <div className="min-h-screen bg-black p-4">
      <h1 className="text-lg font-bold text-white mb-2">Brannloggen Debug</h1>
      <div className="space-y-1">
        {log.map((line, i) => (
          <p key={i} className={`text-xs font-mono ${
            line.includes('feil') || line.includes('Feil') || line.includes('error')
              ? 'text-red-400'
              : line.includes('funnet!') || line.includes('Innlogget') || line.includes('OK')
              ? 'text-green-400'
              : line.startsWith('[')
              ? 'text-yellow-300'
              : 'text-gray-400'
          }`}>
            {line}
          </p>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        <a href="/admin/brukere" className="block py-2 px-4 bg-red-600 text-white text-sm rounded text-center">
          Gå til Admin
        </a>
        <a href="/login" className="block py-2 px-4 bg-blue-600 text-white text-sm rounded text-center">
          Gå til Login
        </a>
      </div>
    </div>
  )
}

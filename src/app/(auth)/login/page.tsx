'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if already logged in
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Already logged in - redirect based on role
        redirectByRole(session.user.id)
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  const redirectByRole = async (userId: string) => {
    // Check if role is already cached
    const cached = localStorage.getItem('brannloggen_user_rolle')
    if (cached) {
      if (cached === 'admin' || cached === '110-admin') window.location.href = '/operator/hendelser'
      else if (cached === 'operator') window.location.href = '/operator/hendelser'
      else if (cached === 'presse') window.location.href = '/presse/hendelser'
      else window.location.href = '/'
      return
    }

    // Try DB query (may fail due to RLS)
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('brukerprofiler')
      .select('rolle, sentral_ids')
      .eq('user_id', userId)
      .maybeSingle()

    const rolle = (profile as { rolle?: string; sentral_ids?: string[] } | null)?.rolle
    const sentralIds = (profile as { rolle?: string; sentral_ids?: string[] } | null)?.sentral_ids
    if (rolle) {
      localStorage.setItem('brannloggen_user_rolle', rolle)
      if (sentralIds && sentralIds.length > 0) {
        localStorage.setItem('brannloggen_user_sentral_ids', JSON.stringify(sentralIds))
      }
      if (rolle === 'admin' || rolle === '110-admin') window.location.href = '/operator/hendelser'
      else if (rolle === 'operator') window.location.href = '/operator/hendelser'
      else if (rolle === 'presse') window.location.href = '/presse/hendelser'
      else window.location.href = '/'
    } else {
      // RLS blocked the query - send to debug to set role manually
      window.location.href = '/debug'
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use server-side rate-limited login endpoint
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Innlogging feilet')
        setLoading(false)
        return
      }

      // Re-sync client session after server-side login
      const supabase = createClient()
      const { data: authData } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      const userId = authData?.user?.id || data.user?.id
      if (userId) {
        // Log successful login
        logActivity({ handling: 'innlogget', tabell: 'auth', detaljer: { metode: 'passord' } })
        await redirectByRole(userId)
      } else {
        window.location.href = '/'
      }
    } catch {
      setError('Kunne ikke koble til serveren')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <div className="text-theme-secondary text-sm">Sjekker innlogging...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-theme">Brannloggen</h1>
          <p className="text-theme-secondary text-sm mt-1">Logg inn for 110-sentral eller admin</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-theme-secondary mb-1">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-theme-card border border-theme-input rounded-lg text-theme focus:outline-none focus:border-blue-500"
              placeholder="operatør@brannvesen.no"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-theme-secondary mb-1">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-theme-card border border-theme-input rounded-lg text-theme focus:outline-none focus:border-blue-500"
              placeholder="Skriv inn passord"
              required
            />
          </div>

          <div className="flex justify-end">
            <a href="/glemt-passord" className="text-sm text-blue-400 hover:text-blue-300">
              Glemt passord?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Logger inn...' : 'Logg inn'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <a href="/presse-registrering" className="block text-sm text-cyan-400 hover:text-cyan-300">
            Er du journalist? Registrer deg her
          </a>
          <a href="/" className="block text-sm text-theme-secondary hover:text-theme">
            Tilbake til forsiden
          </a>
        </div>
      </div>
    </div>
  )
}

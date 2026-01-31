'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    setDebugInfo(`Innlogget som ${authData.user?.email} (${userId})`)

    // Try to get profile
    const { data: profile, error: profileError } = await supabase
      .from('brukerprofiler')
      .select('rolle')
      .eq('user_id', userId!)
      .maybeSingle()

    if (profileError) {
      setDebugInfo(prev => prev + `\nProfil-feil: ${profileError.message} (${profileError.code})`)
      // If profile query fails, show navigation buttons
      setLoggedIn(true)
      setLoading(false)
      return
    }

    if (!profile) {
      setDebugInfo(prev => prev + '\nIngen profil funnet - viser navigasjon')
      setLoggedIn(true)
      setLoading(false)
      return
    }

    setDebugInfo(prev => prev + `\nRolle: ${profile.rolle}`)

    if (profile.rolle === 'admin') {
      window.location.href = '/admin/brukere'
    } else if (profile.rolle === 'operator') {
      window.location.href = '/operator/hendelser'
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Brannloggen</h1>
          <p className="text-gray-400 text-sm mt-1">Logg inn for 110-sentral eller admin</p>
        </div>

        {loggedIn ? (
          <div className="space-y-3">
            <p className="text-green-400 text-sm text-center mb-4">Innlogget! Velg destinasjon:</p>
            <a
              href="/admin/brukere"
              className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-center transition-colors"
            >
              Admin-panel
            </a>
            <a
              href="/operator/hendelser"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition-colors"
            >
              Operatør-panel
            </a>
            <a
              href="/"
              className="block w-full py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold rounded-lg text-center transition-colors"
            >
              Forsiden
            </a>
            {debugInfo && (
              <pre className="mt-4 p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-xs text-yellow-400 whitespace-pre-wrap">{debugInfo}</pre>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">E-post</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="operatør@brannvesen.no"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Passord</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Skriv inn passord"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Logger inn...' : 'Logg inn'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-gray-400 hover:text-white">
                Tilbake til forsiden
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OppdaterPassordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const [hashError, setHashError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // 1. Check hash for Supabase error (e.g. #error=access_denied&error_code=otp_expired)
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const errorCode = params.get('error_code')
    const errorDesc = params.get('error_description')

    if (errorCode || params.get('error')) {
      const messages: Record<string, string> = {
        otp_expired: 'Lenken har utløpt. Be om en ny.',
        access_denied: 'Tilgang nektet. Lenken kan allerede være brukt.',
      }
      setHashError(messages[errorCode || ''] || errorDesc?.replace(/\+/g, ' ') || 'Noe gikk galt med lenken.')
      setChecking(false)
      return
    }

    // 2. Extract tokens from hash and set session manually
    //    @supabase/ssr (createBrowserClient) does NOT auto-detect hash fragments —
    //    it uses cookies, so we must parse and call setSession() ourselves.
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data: { session }, error: sessionError }) => {
        if (session && !sessionError) {
          setHasSession(true)
        }
        setChecking(false)
      })
    } else {
      // No hash tokens — check if user already has a session (e.g. from cookie)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setHasSession(true)
        }
        setChecking(false)
      })
    }

    return () => {}
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn')
      return
    }

    if (password !== confirmPassword) {
      setError('Passordene er ikke like')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError('Kunne ikke oppdatere passordet. Prøv igjen.')
      } else {
        await supabase.auth.signOut()
        setDone(true)
      }
    } catch {
      setError('Kunne ikke koble til serveren')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold text-theme">Sett nytt passord</h1>
          <p className="text-theme-secondary text-sm mt-1">Velg et nytt passord for kontoen din.</p>
        </div>

        {checking ? (
          <div className="text-center">
            <p className="text-sm text-theme-secondary">Verifiserer lenke...</p>
          </div>
        ) : hashError || !hasSession ? (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-400 text-center">
                {hashError || 'Ugyldig eller utløpt lenke. Be om en ny tilbakestillingslenke.'}
              </p>
            </div>
            <a
              href="/glemt-passord"
              className="block w-full py-3 text-center bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              Be om ny lenke
            </a>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-400 text-center">
                Passordet ditt er oppdatert. Du kan nå logge inn med det nye passordet.
              </p>
            </div>
            <a
              href="/login"
              className="block w-full py-3 text-center bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              Gå til innlogging
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-theme-secondary mb-1">Nytt passord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-theme-card border border-theme-input rounded-lg text-theme focus:outline-none focus:border-blue-500"
                placeholder="Minst 8 tegn"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm text-theme-secondary mb-1">Bekreft passord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-theme-card border border-theme-input rounded-lg text-theme focus:outline-none focus:border-blue-500"
                placeholder="Gjenta passordet"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Oppdaterer...' : 'Oppdater passord'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

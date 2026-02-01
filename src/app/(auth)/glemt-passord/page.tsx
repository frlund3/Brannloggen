'use client'

import { useState } from 'react'

export default function GlemtPassordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        setError('For mange forespørsler. Vent noen minutter og prøv igjen.')
      } else {
        // Always show success to prevent email enumeration
        setSent(true)
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
          <h1 className="text-2xl font-bold text-theme">Glemt passord</h1>
          <p className="text-theme-secondary text-sm mt-1">
            Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-400 text-center">
                Vi har sendt en e-post til <strong>{email}</strong> med en lenke for å tilbakestille passordet ditt.
              </p>
            </div>
            <p className="text-xs text-theme-muted text-center">
              Sjekk søppelpost om du ikke finner e-posten.
            </p>
            <a
              href="/login"
              className="block w-full py-3 text-center bg-theme-card border border-theme-input text-theme font-semibold rounded-lg hover:bg-theme-card-hover transition-colors"
            >
              Tilbake til innlogging
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sender...' : 'Send tilbakestillingslenke'}
            </button>

            <a
              href="/login"
              className="block text-sm text-theme-secondary hover:text-theme text-center"
            >
              Tilbake til innlogging
            </a>
          </form>
        )}
      </div>
    </div>
  )
}

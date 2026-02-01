'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Medium {
  id: string
  navn: string
  type: string
}

export default function PresseRegistreringPage() {
  const [fulltNavn, setFulltNavn] = useState('')
  const [epost, setEpost] = useState('')
  const [mediumId, setMediumId] = useState('')
  const [mediehus, setMediehus] = useState('')
  const [telefon, setTelefon] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [medier, setMedier] = useState<Medium[]>([])
  const [medierLoading, setMedierLoading] = useState(true)
  const [medierSok, setMedierSok] = useState('')

  useEffect(() => {
    const fetchMedier = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('medier').select('id, navn, type').eq('aktiv', true).order('navn')
      setMedier(data || [])
      setMedierLoading(false)
    }
    fetchMedier()
  }, [])

  const filteredMedier = medierSok
    ? medier.filter(m => m.navn.toLowerCase().includes(medierSok.toLowerCase()))
    : medier

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediumId && !mediehus.trim()) {
      setError('Velg et mediehus fra listen eller skriv inn navnet.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const selectedMedium = medier.find(m => m.id === mediumId)
      const { error: insertError } = await supabase.from('presse_soknader').insert({
        fullt_navn: fulltNavn,
        epost,
        mediehus: selectedMedium?.navn || mediehus,
        medium_id: mediumId || null,
        telefon: telefon || null,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Det finnes allerede en søknad med denne e-postadressen.')
        } else {
          setError(insertError.message)
        }
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Søknad sendt!</h1>
          <p className="text-gray-400 text-sm mb-6">
            Din søknad om pressetilgang er sendt. Du vil motta en e-post med innloggingsinformasjon
            når kontoen din er godkjent.
          </p>
          <a href="/" className="text-sm text-blue-400 hover:text-blue-300">
            Tilbake til forsiden
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Pressetilgang</h1>
          <p className="text-gray-400 text-sm mt-1">Søk om tilgang til presseinformasjon fra Brannloggen</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fullt navn *</label>
            <input
              type="text"
              value={fulltNavn}
              onChange={(e) => setFulltNavn(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="Ola Nordmann"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">E-post *</label>
            <input
              type="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="journalist@mediehus.no"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mediehus / redaksjon *</label>
            {medierLoading ? (
              <div className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-500 text-sm">Laster medier...</div>
            ) : (
              <>
                <input
                  type="text"
                  value={medierSok}
                  onChange={(e) => {
                    setMedierSok(e.target.value)
                    setMediumId('')
                    setMediehus(e.target.value)
                  }}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-cyan-500 mb-2"
                  placeholder="Søk eller skriv inn mediehus..."
                />
                {medierSok && !mediumId && (
                  <div className="max-h-40 overflow-y-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                    {filteredMedier.slice(0, 8).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMediumId(m.id)
                          setMedierSok(m.navn)
                          setMediehus(m.navn)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#2a2a2a] transition-colors"
                      >
                        {m.navn}
                        <span className="text-xs text-gray-500 ml-2">{m.type}</span>
                      </button>
                    ))}
                    {filteredMedier.length === 0 && (
                      <div className="px-4 py-2.5 text-sm text-gray-400">
                        Ingen treff. &quot;{medierSok}&quot; sendes som egendefinert mediehus.
                      </div>
                    )}
                  </div>
                )}
                {mediumId && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <span className="text-sm text-cyan-400">{medier.find(m => m.id === mediumId)?.navn}</span>
                    <button type="button" onClick={() => { setMediumId(''); setMedierSok(''); setMediehus('') }} className="text-xs text-gray-400 hover:text-white ml-auto">Endre</button>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Telefon</label>
            <input
              type="tel"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="+47 123 45 678"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Sender...' : 'Send søknad'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <a href="/login" className="block text-sm text-gray-400 hover:text-white">
            Har du allerede konto? Logg inn
          </a>
          <a href="/" className="block text-sm text-gray-400 hover:text-white">
            Tilbake til forsiden
          </a>
        </div>
      </div>
    </div>
  )
}

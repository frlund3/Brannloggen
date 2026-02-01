'use client'

import { PresseLayout } from '@/components/presse/PresseLayout'
import { useFylker, useKategorier, useSentraler } from '@/hooks/useSupabaseData'
import { useAuth } from '@/components/providers/AuthProvider'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { registerPush } from '@/lib/capacitor'

export default function PresseInnstillingerPage() {
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { user } = useAuth()
  const [selectedSentral, setSelectedSentral] = useState('')
  const [selectedFylker, setSelectedFylker] = useState<string[]>([])
  const [selectedKategorier, setSelectedKategorier] = useState<string[]>([])
  const [minAlvorlighet, setMinAlvorlighet] = useState('middels')
  const [kunPågående, setKunPågående] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('push_abonnenter') as any)
          .select('fylke_ids, kategori_ids, kun_pågående')
          .eq('device_id', `presse-${user.id}`)
          .single()
        if (data) {
          setSelectedFylker(data.fylke_ids || [])
          setSelectedKategorier(data.kategori_ids || [])
          setKunPågående(data.kun_pågående || false)
        }
        const stored = localStorage.getItem(`brannloggen_presse_prefs_${user.id}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.minAlvorlighet) setMinAlvorlighet(parsed.minAlvorlighet)
        }
      } catch {
        // No existing preferences
      }
      setLoaded(true)
    }
    load()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      // Request real push token from browser
      const pushToken = await registerPush()
      if (!pushToken) {
        toast.error('Push-tillatelse ble ikke gitt. Sjekk nettleserinnstillingene dine.')
        setSaving(false)
        return
      }

      const supabase = createClient()
      const record = {
        id: `presse-${user.id}`,
        device_id: `presse-${user.id}`,
        platform: 'Web',
        push_token: pushToken,
        push_aktiv: true,
        sentral_ids: [],
        fylke_ids: selectedFylker,
        kategori_ids: selectedKategorier,
        kun_pågående: kunPågående,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('push_abonnenter') as any).upsert(record, { onConflict: 'device_id' })
      if (error) throw error
      localStorage.setItem(`brannloggen_presse_prefs_${user.id}`, JSON.stringify({ minAlvorlighet }))
      toast.success('Innstillinger lagret og push-varsler aktivert')
    } catch (err) {
      toast.error('Kunne ikke lagre: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  if (fylkerLoading || kategorierLoading || sentralerLoading || !loaded) {
    return (
      <PresseLayout>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </PresseLayout>
    )
  }

  const toggleFylke = (id: string) => {
    setSelectedFylker(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const toggleKategori = (id: string) => {
    setSelectedKategorier(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    )
  }

  return (
    <PresseLayout>
      <div className="py-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Varselinnstillinger</h1>
          <p className="text-sm text-gray-400">Velg hva du ønsker push-varsler om</p>
        </div>

        <div className="space-y-6">
          {/* Minimum severity */}
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Minimum alvorlighetsgrad</h2>
            <p className="text-xs text-gray-400 mb-3">Du mottar varsler for denne og høyere alvorlighetsgrader</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'lav', label: 'Lav', color: 'bg-green-500' },
                { value: 'middels', label: 'Middels', color: 'bg-yellow-500' },
                { value: 'høy', label: 'Høy', color: 'bg-orange-500' },
                { value: 'kritisk', label: 'Kritisk', color: 'bg-red-500' },
              ].map((sev) => (
                <button
                  key={sev.value}
                  onClick={() => setMinAlvorlighet(sev.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors touch-manipulation ${
                    minAlvorlighet === sev.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${sev.color}`} />
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Only ongoing */}
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Kun pågående hendelser</h2>
                <p className="text-xs text-gray-400 mt-0.5">Kun varsler for aktive hendelser, ikke oppdateringer på avsluttede</p>
              </div>
              <button
                onClick={() => setKunPågående(!kunPågående)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 touch-manipulation ${
                  kunPågående ? 'bg-blue-500' : 'bg-[#2a2a2a]'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  kunPågående ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          {/* Fylker */}
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Fylker</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedFylker.length === 0 ? 'Alle fylker (standard)' : `${selectedFylker.length} valgt`}
                </p>
              </div>
              {selectedFylker.length > 0 && (
                <button onClick={() => setSelectedFylker([])} className="text-xs text-blue-400 touch-manipulation">
                  Nullstill
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {fylker.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFylke(f.id)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-colors touch-manipulation ${
                    selectedFylker.includes(f.id)
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 border border-transparent hover:bg-[#222]'
                  }`}
                >
                  {f.navn}
                </button>
              ))}
            </div>
          </div>

          {/* Kategorier */}
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Kategorier</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedKategorier.length === 0 ? 'Alle kategorier (standard)' : `${selectedKategorier.length} valgt`}
                </p>
              </div>
              {selectedKategorier.length > 0 && (
                <button onClick={() => setSelectedKategorier([])} className="text-xs text-blue-400 touch-manipulation">
                  Nullstill
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {kategorier.map((k) => (
                <button
                  key={k.id}
                  onClick={() => toggleKategori(k.id)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 touch-manipulation ${
                    selectedKategorier.includes(k.id)
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 border border-transparent hover:bg-[#222]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: k.farge }} />
                  {k.navn}
                </button>
              ))}
            </div>
          </div>

          {/* Kontakt 110-sentral */}
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <h2 className="text-sm font-semibold text-white mb-2">Kontakt 110-sentral</h2>
            <p className="text-xs text-gray-400 mb-3">Velg en 110-sentral for å se kontaktinformasjon</p>
            <select
              value={selectedSentral}
              onChange={(e) => setSelectedSentral(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 mb-3"
            >
              <option value="">Velg 110-sentral</option>
              {sentraler.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(s => (
                <option key={s.id} value={s.id}>{s.kort_navn}</option>
              ))}
            </select>
            {selectedSentral && (() => {
              const sentral = sentraler.find(s => s.id === selectedSentral)
              if (!sentral) return null
              return sentral.kontakt_epost ? (
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">E-post</p>
                  <a href={`mailto:${sentral.kontakt_epost}`} className="text-sm text-blue-400 hover:text-blue-300">
                    {sentral.kontakt_epost}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Ingen kontakt-e-post registrert for denne sentralen.</p>
              )
            })()}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors touch-manipulation"
          >
            {saving ? 'Lagrer...' : 'Lagre innstillinger'}
          </button>
        </div>
      </div>
    </PresseLayout>
  )
}

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFylker, useKategorier, useBrannvesen, useSentraler } from '@/hooks/useSupabaseData'
import { usePushRegistration } from '@/hooks/usePushRegistration'
import { useAuth } from '@/components/providers/AuthProvider'

const STORAGE_KEY = 'brannloggen_push_prefs'

interface PushPrefs {
  pushEnabled: boolean
  onlyOngoing: boolean
  sentraler: string[]
  fylker: string[]
  kategorier: string[]
  brannvesen: string[]
}

const defaultPrefs: PushPrefs = {
  pushEnabled: false,
  onlyOngoing: false,
  sentraler: [],
  fylker: [],
  kategorier: [],
  brannvesen: [],
}

function loadPrefs(): PushPrefs {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultPrefs, ...JSON.parse(saved) }
  } catch {}
  return defaultPrefs
}

export function SettingsView() {
  const { user } = useAuth()
  const { data: fylker, loading: loadingFylker } = useFylker()
  const { data: kategorier, loading: loadingKategorier } = useKategorier()
  const { data: brannvesen, loading: loadingBrannvesen } = useBrannvesen()
  const { data: sentraler, loading: loadingSentraler } = useSentraler()
  const loading = loadingFylker || loadingKategorier || loadingBrannvesen || loadingSentraler
  const { register: registerPush, unregister: unregisterPush, registering: pushRegistering } = usePushRegistration()
  const [prefs, setPrefs] = useState<PushPrefs>(defaultPrefs)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(loadPrefs())
  }, [])

  const savePrefs = useCallback((newPrefs: PushPrefs) => {
    setPrefs(newPrefs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const toggleItem = (key: 'sentraler' | 'fylker' | 'kategorier' | 'brannvesen', id: string) => {
    const arr = prefs[key]
    const updated = arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id]
    savePrefs({ ...prefs, [key]: updated })
  }

  // Filter brannvesen by selected fylker
  const filteredBrannvesen = useMemo(() => {
    if (prefs.fylker.length === 0) return brannvesen
    return brannvesen.filter(b => prefs.fylker.includes(b.fylke_id))
  }, [prefs.fylker, brannvesen])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1">Innstillinger</h1>
        <p className="text-sm text-gray-400 mt-8 text-center">Laster...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-1">Innstillinger</h1>
      <p className="text-xs text-gray-500 mb-6">Velg hva du vil få varsler om. Lagres lokalt på denne enheten.</p>

      {/* Saved toast */}
      {saved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-sm px-4 py-2 rounded-lg z-50 animate-pulse">
          Innstillinger lagret
        </div>
      )}

      {/* Push section - full width */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Push-varsler</h2>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-white">Aktiver push-varsler</span>
              <p className="text-xs text-gray-500 mt-0.5">Få varsel om hendelser på enheten</p>
            </div>
            <button
              disabled={pushRegistering}
              onClick={async () => {
                const newEnabled = !prefs.pushEnabled
                if (newEnabled) {
                  await registerPush({
                    sentral_ids: prefs.sentraler,
                    fylke_ids: prefs.fylker,
                    kategori_ids: prefs.kategorier,
                    kun_pågående: prefs.onlyOngoing,
                  })
                } else {
                  await unregisterPush()
                }
                savePrefs({ ...prefs, pushEnabled: newEnabled })
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                prefs.pushEnabled ? 'bg-blue-500' : 'bg-gray-600'
              } ${pushRegistering ? 'opacity-50' : ''}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  prefs.pushEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-white">Kun pågående hendelser</span>
              <p className="text-xs text-gray-500 mt-0.5">Ikke varsle om avsluttede hendelser</p>
            </div>
            <button
              onClick={() => savePrefs({ ...prefs, onlyOngoing: !prefs.onlyOngoing })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                prefs.onlyOngoing ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  prefs.onlyOngoing ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Two-column grid for filter lists on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 110-sentraler */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              110-sentraler
              {prefs.sentraler.length > 0 && (
                <span className="text-sm text-blue-400 font-normal ml-2">
                  ({prefs.sentraler.length} valgt)
                </span>
              )}
            </h2>
            {prefs.sentraler.length > 0 && (
              <button onClick={() => savePrefs({ ...prefs, sentraler: [] })} className="text-xs text-gray-400">
                Nullstill
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">Ingen valgt = alle sentraler</p>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
            {sentraler.map((s, i) => (
              <button
                key={s.id}
                onClick={() => toggleItem('sentraler', s.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                  i < sentraler.length - 1 ? 'border-b border-[#2a2a2a]' : ''
                } ${prefs.sentraler.includes(s.id) ? 'text-blue-400' : 'text-white'}`}
              >
                <div>
                  <span className="text-sm">{s.kort_navn}</span>
                  <span className="text-xs text-gray-500 ml-2">{s.navn !== s.kort_navn ? s.navn : ''}</span>
                </div>
                {prefs.sentraler.includes(s.id) && (
                  <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Fylker */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Fylker
              {prefs.fylker.length > 0 && (
                <span className="text-sm text-blue-400 font-normal ml-2">
                  ({prefs.fylker.length} valgt)
                </span>
              )}
            </h2>
            {prefs.fylker.length > 0 && (
              <button onClick={() => savePrefs({ ...prefs, fylker: [] })} className="text-xs text-gray-400">
                Nullstill
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">Ingen valgt = alle fylker. Valgte fylker filtrerer brannvesen nedenfor.</p>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
            {fylker.map((f, i) => (
              <button
                key={f.id}
                onClick={() => toggleItem('fylker', f.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                  i < fylker.length - 1 ? 'border-b border-[#2a2a2a]' : ''
                } ${prefs.fylker.includes(f.id) ? 'text-blue-400' : 'text-white'}`}
              >
                <span className="text-sm">{f.navn}</span>
                {prefs.fylker.includes(f.id) && (
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Kategorier */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Hendelsestyper
              {prefs.kategorier.length > 0 && (
                <span className="text-sm text-blue-400 font-normal ml-2">
                  ({prefs.kategorier.length} valgt)
                </span>
              )}
            </h2>
            {prefs.kategorier.length > 0 && (
              <button onClick={() => savePrefs({ ...prefs, kategorier: [] })} className="text-xs text-gray-400">
                Nullstill
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">Ingen valgt = alle typer</p>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-h-80 overflow-y-auto">
            {kategorier.map((k, i) => (
              <button
                key={k.id}
                onClick={() => toggleItem('kategorier', k.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                  i < kategorier.length - 1 ? 'border-b border-[#2a2a2a]' : ''
                } ${prefs.kategorier.includes(k.id) ? 'text-blue-400' : 'text-white'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: k.farge }} />
                  <span className="text-sm">{k.navn}</span>
                </div>
                {prefs.kategorier.includes(k.id) && (
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Brannvesen */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Brannvesen
              {prefs.brannvesen.length > 0 && (
                <span className="text-sm text-blue-400 font-normal ml-2">
                  ({prefs.brannvesen.length} valgt)
                </span>
              )}
            </h2>
            {prefs.brannvesen.length > 0 && (
              <button onClick={() => savePrefs({ ...prefs, brannvesen: [] })} className="text-xs text-gray-400">
                Nullstill
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">
            {prefs.fylker.length > 0
              ? `Filtrert etter valgte fylker (${filteredBrannvesen.length} brannvesen)`
              : 'Ingen valgt = alle brannvesen'}
          </p>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-h-80 overflow-y-auto">
            {filteredBrannvesen.map((b, i) => (
              <button
                key={b.id}
                onClick={() => toggleItem('brannvesen', b.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${
                  i < filteredBrannvesen.length - 1 ? 'border-b border-[#2a2a2a]' : ''
                } ${prefs.brannvesen.includes(b.id) ? 'text-blue-400' : 'text-white'}`}
              >
                <span className="text-sm">{b.kort_navn}</span>
                {prefs.brannvesen.includes(b.id) && (
                  <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Version info + login/logout */}
      <section className="mb-24">
        <div className="text-center space-y-2">
          <a href="/personvern" className="text-xs text-gray-500 hover:text-gray-400 block mb-2">Personvern</a>
          <p className="text-xs text-gray-600">Brannloggen v0.1.0</p>
          {user ? (
            <button
              onClick={() => {
                // Force clear everything - no async
                localStorage.removeItem('brannloggen_user_rolle')
                localStorage.removeItem('brannloggen_user_sentral_ids')
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('sb-')) localStorage.removeItem(key)
                })
                document.cookie.split(';').forEach(c => {
                  const name = c.split('=')[0].trim()
                  if (name.startsWith('sb-')) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
                  }
                })
                window.location.href = '/'
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Logg ut ({user.email})
            </button>
          ) : (
            <a href="/login" className="text-xs text-gray-600 hover:text-gray-400">
              Operatør / Admin
            </a>
          )}
        </div>
      </section>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFylker, useKategorier, useSentraler } from '@/hooks/useSupabaseData'
import { usePushRegistration } from '@/hooks/usePushRegistration'

const ONBOARDING_KEY = 'brannloggen_push_onboarding_done'
const PREFS_KEY = 'brannloggen_push_prefs'

interface PushOnboardingProps {
  onComplete: () => void
}

type Step = 'intro' | 'sentraler' | 'fylker' | 'kategorier' | 'confirm'

export function PushOnboarding({ onComplete }: PushOnboardingProps) {
  const { data: sentraler } = useSentraler()
  const { data: fylker } = useFylker()
  const { data: kategorier } = useKategorier()
  const { register, registering } = usePushRegistration()

  const [step, setStep] = useState<Step>('intro')
  const [selectedSentraler, setSelectedSentraler] = useState<string[]>([])
  const [selectedFylker, setSelectedFylker] = useState<string[]>([])
  const [selectedKategorier, setSelectedKategorier] = useState<string[]>([])
  const [onlyOngoing, setOnlyOngoing] = useState(false)

  // Popular kategorier for quick selection
  const popularKategorier = useMemo(() => {
    const popular = ['kat-bygningsbrann', 'kat-brann-i-det-fri', 'kat-trafikkulykke', 'kat-aba', 'kat-redning-generell', 'kat-akutt-forurensning']
    return kategorier.filter(k => popular.includes(k.id))
  }, [kategorier])

  const otherKategorier = useMemo(() => {
    const popular = ['kat-bygningsbrann', 'kat-brann-i-det-fri', 'kat-trafikkulykke', 'kat-aba', 'kat-redning-generell', 'kat-akutt-forurensning']
    return kategorier.filter(k => !popular.includes(k.id))
  }, [kategorier])

  const [showAllKategorier, setShowAllKategorier] = useState(false)

  const toggleItem = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id]

  const handleFinish = async () => {
    // Save preferences to localStorage (used by the app for filtering)
    const prefs = {
      pushEnabled: true,
      onlyOngoing,
      sentraler: selectedSentraler,
      fylker: selectedFylker,
      kategorier: selectedKategorier,
      brannvesen: [],
    }
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))

    // Try to register for actual push notifications
    await register({
      sentral_ids: selectedSentraler,
      fylke_ids: selectedFylker,
      kategori_ids: selectedKategorier,
      kun_pågående: onlyOngoing,
    })

    // Mark onboarding as done
    localStorage.setItem(ONBOARDING_KEY, 'true')
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    onComplete()
  }

  const summaryCount = selectedSentraler.length + selectedFylker.length + selectedKategorier.length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleSkip} />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-[#141414] rounded-t-2xl sm:rounded-2xl border border-[#2a2a2a] max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom">

        {/* STEP: Intro */}
        {step === 'intro' && (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Varsler fra Brannloggen</h2>
            <p className="text-sm text-gray-400 mb-6">
              Velg hvilke hendelser du vil bli varslet om. Du kan endre dette senere i innstillinger.
            </p>
            <button
              onClick={() => setStep('sentraler')}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
            >
              Sett opp varsler
            </button>
            <button
              onClick={handleSkip}
              className="mt-3 text-sm text-gray-500 hover:text-gray-400"
            >
              Hopp over
            </button>
          </div>
        )}

        {/* STEP: Sentraler */}
        {step === 'sentraler' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">110-sentraler</h2>
                <span className="text-xs text-gray-500">Steg 1/3</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Velg sentraler du er interessert i. Ingen valgt = alle.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {sentraler.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSentraler(toggleItem(selectedSentraler, s.id))}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedSentraler.includes(s.id)
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'bg-[#1a1a1a] text-white border border-transparent hover:border-[#3a3a3a]'
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium">{s.kort_navn}</span>
                    {s.navn !== s.kort_navn && (
                      <span className="text-xs text-gray-500 ml-2">{s.navn}</span>
                    )}
                  </div>
                  {selectedSentraler.includes(s.id) && (
                    <svg className="w-5 h-5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-[#2a2a2a] flex gap-3">
              <button onClick={() => setStep('intro')} className="flex-1 py-2.5 bg-[#1a1a1a] text-gray-400 rounded-xl text-sm">
                Tilbake
              </button>
              <button onClick={() => setStep('fylker')} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium">
                Neste
              </button>
            </div>
          </div>
        )}

        {/* STEP: Fylker */}
        {step === 'fylker' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Fylker</h2>
                <span className="text-xs text-gray-500">Steg 2/3</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Velg fylker du vil ha varsler fra. Ingen valgt = alle.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {fylker.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFylker(toggleItem(selectedFylker, f.id))}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedFylker.includes(f.id)
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'bg-[#1a1a1a] text-white border border-transparent hover:border-[#3a3a3a]'
                  }`}
                >
                  <span className="text-sm font-medium">{f.navn}</span>
                  {selectedFylker.includes(f.id) && (
                    <svg className="w-5 h-5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-[#2a2a2a] flex gap-3">
              <button onClick={() => setStep('sentraler')} className="flex-1 py-2.5 bg-[#1a1a1a] text-gray-400 rounded-xl text-sm">
                Tilbake
              </button>
              <button onClick={() => setStep('kategorier')} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium">
                Neste
              </button>
            </div>
          </div>
        )}

        {/* STEP: Kategorier */}
        {step === 'kategorier' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Hendelsestyper</h2>
                <span className="text-xs text-gray-500">Steg 3/3</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Velg typer hendelser. Ingen valgt = alle typer.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Popular categories */}
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Vanlige</p>
              <div className="space-y-1 mb-4">
                {popularKategorier.map(k => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKategorier(toggleItem(selectedKategorier, k.id))}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      selectedKategorier.includes(k.id)
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'bg-[#1a1a1a] text-white border border-transparent hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: k.farge }} />
                      <span className="text-sm">{k.navn}</span>
                    </div>
                    {selectedKategorier.includes(k.id) && (
                      <svg className="w-5 h-5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Show all button */}
              <button
                onClick={() => setShowAllKategorier(!showAllKategorier)}
                className="text-xs text-blue-400 mb-2"
              >
                {showAllKategorier ? 'Skjul andre typer' : `Vis alle ${otherKategorier.length} andre typer`}
              </button>

              {showAllKategorier && (
                <div className="space-y-1">
                  {otherKategorier.map(k => (
                    <button
                      key={k.id}
                      onClick={() => setSelectedKategorier(toggleItem(selectedKategorier, k.id))}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedKategorier.includes(k.id)
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'bg-[#1a1a1a] text-white border border-transparent hover:border-[#3a3a3a]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: k.farge }} />
                        <span className="text-xs">{k.navn}</span>
                      </div>
                      {selectedKategorier.includes(k.id) && (
                        <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Only ongoing toggle */}
              <div className="mt-4 bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">Kun pågående hendelser</span>
                  <p className="text-xs text-gray-500">Ikke varsle om avsluttede</p>
                </div>
                <button
                  onClick={() => setOnlyOngoing(!onlyOngoing)}
                  className={`w-12 h-7 rounded-full transition-colors relative touch-manipulation shrink-0 ${
                    onlyOngoing ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5.5 h-5.5 w-[22px] h-[22px] bg-white rounded-full absolute top-[3px] transition-transform ${
                    onlyOngoing ? 'translate-x-[22px]' : 'translate-x-[3px]'
                  }`} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-[#2a2a2a] flex gap-3">
              <button onClick={() => setStep('fylker')} className="flex-1 py-2.5 bg-[#1a1a1a] text-gray-400 rounded-xl text-sm">
                Tilbake
              </button>
              <button onClick={() => setStep('confirm')} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium">
                Neste
              </button>
            </div>
          </div>
        )}

        {/* STEP: Confirm */}
        {step === 'confirm' && (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Klar til å aktivere</h2>
            <div className="text-sm text-gray-400 mb-4 space-y-1">
              {summaryCount === 0 ? (
                <p>Du vil motta varsler om alle hendelser i hele Norge.</p>
              ) : (
                <>
                  {selectedSentraler.length > 0 && (
                    <p>{selectedSentraler.length} sentral{selectedSentraler.length > 1 ? 'er' : ''} valgt</p>
                  )}
                  {selectedFylker.length > 0 && (
                    <p>{selectedFylker.length} fylke{selectedFylker.length > 1 ? 'r' : ''} valgt</p>
                  )}
                  {selectedKategorier.length > 0 && (
                    <p>{selectedKategorier.length} hendelsestype{selectedKategorier.length > 1 ? 'r' : ''} valgt</p>
                  )}
                  {onlyOngoing && <p>Kun pågående hendelser</p>}
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-6">
              Du vil bli spurt om tillatelse til å sende varsler. Du kan endre innstillingene når som helst.
            </p>
            <button
              onClick={handleFinish}
              disabled={registering}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white rounded-xl font-medium transition-colors"
            >
              {registering ? 'Aktiverer...' : 'Aktiver varsler'}
            </button>
            <button
              onClick={() => setStep('kategorier')}
              className="mt-3 text-sm text-gray-500 hover:text-gray-400"
            >
              Tilbake
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to check if push onboarding should be shown.
 */
export function useShouldShowPushOnboarding(): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY)
    if (!done) {
      // Small delay so it doesn't flash immediately on load
      const timer = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  return show
}

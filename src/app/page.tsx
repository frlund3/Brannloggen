'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { IncidentCard } from '@/components/public/IncidentCard'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { BottomNav } from '@/components/public/BottomNav'
import { FilterSheet, FilterState, emptyFilters } from '@/components/public/FilterSheet'
import { SettingsView } from '@/components/public/SettingsView'
import { PushOnboarding, useShouldShowPushOnboarding } from '@/components/public/PushOnboarding'
import { useHendelser, useSentraler } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { IncidentListSkeleton } from '@/components/ui/Skeleton'
import Image from 'next/image'

const PREFS_KEY = 'brannloggen_push_prefs'

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

type Tab = 'følger' | 'alle' | 'innstillinger'
type SubTab = 'alle' | 'pågår'

export default function HomePage() {
  // If Supabase redirects here with recovery tokens in the hash fragment,
  // redirect to /oppdater-passord which handles the token exchange.
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      window.location.replace('/oppdater-passord#' + hash)
    }
  }, [])

  const { data: hendelser, loading: hendelserLoading, refetch } = useHendelser({ excludeDeactivated: true })
  useRealtimeHendelser(refetch)
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { rolle } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])
  const { containerRef, refreshing, pullDistance, progress } = usePullToRefresh({ onRefresh: handleRefresh })

  const dashboardHref = rolle === 'admin' || rolle === '110-admin' ? '/operator/hendelser'
    : rolle === 'operator' ? '/operator/hendelser'
    : rolle === 'presse' ? '/presse/hendelser'
    : null
  const dashboardLabel = rolle === 'admin' ? 'Admin' : rolle === '110-admin' ? '110-Admin' : rolle === 'operator' ? '110-Sentral' : rolle === 'presse' ? 'Presse' : null

  const [activeTab, setActiveTab] = useState<Tab>('alle')
  const [subTab, setSubTab] = useState<SubTab>('alle')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [pushPrefs, setPushPrefs] = useState<PushPrefs>(defaultPrefs)
  const showOnboarding = useShouldShowPushOnboarding()
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)

  const loading = hendelserLoading || sentralerLoading

  // Load push prefs from localStorage, re-read when switching tabs (to pick up changes from settings)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY)
      if (saved) setPushPrefs({ ...defaultPrefs, ...JSON.parse(saved) })
    } catch {}
  }, [activeTab])

  // Check if user has any prefs configured
  const hasPrefs = pushPrefs.sentraler.length > 0 || pushPrefs.fylker.length > 0 || pushPrefs.kategorier.length > 0 || pushPrefs.brannvesen.length > 0

  const allHendelser = useMemo(() => {
    let result = [...hendelser]

    // Apply filters
    if (filters.fylke_ids.length > 0) {
      result = result.filter((h) => filters.fylke_ids.includes(h.fylke_id))
    }
    if (filters.kommune_ids.length > 0) {
      result = result.filter((h) => filters.kommune_ids.includes(h.kommune_id))
    }
    if (filters.brannvesen_ids.length > 0) {
      result = result.filter((h) => filters.brannvesen_ids.includes(h.brannvesen_id))
    }
    if (filters.kategori_ids.length > 0) {
      result = result.filter((h) => filters.kategori_ids.includes(h.kategori_id))
    }
    if (filters.sentral_ids.length > 0) {
      const sentralBrannvesen = filters.sentral_ids.flatMap(sId => {
        const s = sentraler.find(x => x.id === sId)
        return s ? s.brannvesen_ids : []
      })
      result = result.filter((h) => sentralBrannvesen.includes(h.brannvesen_id))
    }
    if (filters.status) {
      result = result.filter((h) => h.status === filters.status)
    }

    // Sort by newest first
    result.sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())

    return result
  }, [hendelser, sentraler, filters])

  // "Jeg følger" - filter based on push preferences from settings
  const følgerHendelser = useMemo(() => {
    let result = [...hendelser]

    // Filter by sentral preferences
    if (pushPrefs.sentraler.length > 0) {
      const sentralBrannvesen = pushPrefs.sentraler.flatMap(sId => {
        const s = sentraler.find(x => x.id === sId)
        return s ? s.brannvesen_ids : []
      })
      result = result.filter((h) => sentralBrannvesen.includes(h.brannvesen_id))
    }

    // Filter by fylke preferences
    if (pushPrefs.fylker.length > 0) {
      result = result.filter((h) => pushPrefs.fylker.includes(h.fylke_id))
    }

    // Filter by brannvesen preferences
    if (pushPrefs.brannvesen.length > 0) {
      result = result.filter((h) => pushPrefs.brannvesen.includes(h.brannvesen_id))
    }

    // Filter by kategori preferences
    if (pushPrefs.kategorier.length > 0) {
      result = result.filter((h) => pushPrefs.kategorier.includes(h.kategori_id))
    }

    // Filter by onlyOngoing or subTab
    if (pushPrefs.onlyOngoing || subTab === 'pågår') {
      result = result.filter((h) => h.status === 'pågår')
    }

    result.sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())
    return result
  }, [hendelser, sentraler, pushPrefs, subTab])

  const activeFilterCount =
    filters.fylke_ids.length +
    filters.kommune_ids.length +
    filters.brannvesen_ids.length +
    filters.kategori_ids.length +
    filters.sentral_ids.length +
    (filters.status ? 1 : 0)

  // Count active preference filters for badge
  const prefsFilterCount = pushPrefs.sentraler.length + pushPrefs.fylker.length + pushPrefs.kategorier.length + pushPrefs.brannvesen.length

  return (
    <div ref={containerRef} className="min-h-screen bg-theme pb-20 lg:pb-0">
      {/* Pull-to-refresh indicator (mobile only) */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none lg:hidden"
          style={{ transform: `translateY(${refreshing ? 48 : pullDistance}px)`, transition: refreshing ? 'transform 200ms ease' : 'none' }}
        >
          <div className={`w-8 h-8 rounded-full bg-theme-card border border-theme shadow-lg flex items-center justify-center ${refreshing ? 'animate-spin' : ''}`}>
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ transform: `rotate(${progress * 360}deg)`, transition: refreshing ? 'none' : 'transform 100ms' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}
      {/* Push Onboarding Popup */}
      {showOnboarding && !onboardingDismissed && (
        <PushOnboarding onComplete={() => setOnboardingDismissed(true)} />
      )}

      {/* Shared Header */}
      <header className="sticky top-0 z-30 bg-theme/95 backdrop-blur border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + Name */}
          <div className="flex items-center gap-2.5">
            <Image src="/icon-192.png" alt="Brannloggen" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold hidden sm:inline">Brannloggen</span>
          </div>

          {/* Desktop Tab Navigation */}
          <div className="hidden lg:flex items-center gap-3">
            <nav className="flex items-center gap-1 bg-theme-card rounded-lg p-1">
              {([
                { id: 'følger' as Tab, label: 'Jeg følger' },
                { id: 'alle' as Tab, label: 'Alle' },
                { id: 'innstillinger' as Tab, label: 'Innstillinger' },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-theme-card-hover text-theme' : 'text-theme-secondary hover:text-theme'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-theme-card hover:bg-theme-card-hover text-theme-secondary hover:text-theme transition-colors"
              title={theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {dashboardHref ? (
              <a
                href={dashboardHref}
                className="px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {dashboardLabel}
              </a>
            ) : (
              <a
                href="/login"
                className="px-4 py-1.5 bg-theme-card hover:bg-theme-card-hover text-theme-secondary hover:text-theme rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Logg inn
              </a>
            )}
          </div>

          {/* Mobile: Bell + Theme + Tab-specific actions */}
          <div className="lg:hidden flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="p-1 rounded-lg text-theme-secondary hover:text-theme transition-colors"
              title={theme === 'dark' ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {activeTab === 'alle' && (
              <button
                onClick={() => setFilterOpen(true)}
                className="text-blue-400 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filter
                {activeFilterCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            {activeTab === 'følger' && (
              <button
                onClick={() => setActiveTab('innstillinger')}
                className="text-blue-400 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Tilpass
                {prefsFilterCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {prefsFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab-specific sub-header content */}
        {activeTab === 'følger' && (
          <div className="max-w-7xl mx-auto">
            {/* Active prefs summary */}
            {hasPrefs && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-1">
                  {pushPrefs.sentraler.map(sId => {
                    const s = sentraler.find(x => x.id === sId)
                    return s ? <span key={sId} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{s.kort_navn}</span> : null
                  })}
                  {pushPrefs.onlyOngoing && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Kun pågående</span>}
                </div>
              </div>
            )}
            <div className="px-4 pb-3 max-w-md">
              <div className="flex bg-theme-card rounded-lg p-1">
                <button
                  onClick={() => setSubTab('alle')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    subTab === 'alle' ? 'bg-theme-card-hover text-theme' : 'text-theme-secondary'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setSubTab('pågår')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    subTab === 'pågår' ? 'bg-blue-500 text-white' : 'text-theme-secondary'
                  }`}
                >
                  Pågår
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content area with optional desktop sidebar */}
      <div className="max-w-7xl mx-auto lg:flex">
        {/* Desktop Sidebar - filter panel for "Alle" tab */}
        {activeTab === 'alle' && (
          <aside className="hidden lg:block w-80 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] border-r border-theme">
            <FilterSheet
              isOpen={true}
              onClose={() => {}}
              filters={filters}
              onFiltersChange={setFilters}
              mode="sidebar"
            />
          </aside>
        )}

        {/* Content area */}
        <main className="flex-1 px-4 py-4">
          {/* FØLGER TAB */}
          {activeTab === 'følger' && (
            <div className="max-w-5xl mx-auto">
              {loading ? (
                <IncidentListSkeleton />
              ) : !hasPrefs ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-theme-dim mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-theme-secondary mb-2">Ingen preferanser satt ennå</p>
                  <p className="text-xs text-theme-muted mb-4">Gå til innstillinger og velg hvilke 110-sentraler, fylker eller kategorier du vil følge.</p>
                  <button
                    onClick={() => setActiveTab('innstillinger')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Gå til innstillinger
                  </button>
                </div>
              ) : følgerHendelser.length > 0 ? (
                <div className="space-y-3">
                  {følgerHendelser.map((h) => (
                    <IncidentCard key={h.id} {...h} oppdateringer={h.oppdateringer} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-theme-muted py-12">
                  {subTab === 'pågår'
                    ? 'Ingen pågående hendelser matcher dine preferanser.'
                    : 'Ingen hendelser matcher dine preferanser.'}
                </p>
              )}
            </div>
          )}

          {/* ALLE MELDINGER TAB */}
          {activeTab === 'alle' && (
            <div className="max-w-5xl mx-auto">
              {loading ? (
                <IncidentListSkeleton />
              ) : allHendelser.length > 0 ? (
                <div className="space-y-3">
                  {allHendelser.map((h) => (
                    <IncidentCard key={h.id} {...h} oppdateringer={h.oppdateringer} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-theme-muted py-12">
                  Ingen hendelser funnet med valgte filtre.
                </p>
              )}
            </div>
          )}

          {/* INNSTILLINGER TAB */}
          {activeTab === 'innstillinger' && <SettingsView />}
        </main>
      </div>

      {/* Mobile FilterSheet (bottom sheet) */}
      <div className="lg:hidden">
        <FilterSheet
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
          mode="sheet"
        />
      </div>

      {/* Mobile BottomNav */}
      <div className="lg:hidden">
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  )
}

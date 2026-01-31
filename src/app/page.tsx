'use client'

import { useState, useMemo } from 'react'
import { IncidentCard } from '@/components/public/IncidentCard'
import { BottomNav } from '@/components/public/BottomNav'
import { FilterSheet, FilterState, emptyFilters } from '@/components/public/FilterSheet'
import { SettingsView } from '@/components/public/SettingsView'
import { mockHendelser } from '@/data/mock-hendelser'
import { sentraler } from '@/data/sentraler'

type Tab = 'følger' | 'alle' | 'innstillinger'
type SubTab = 'alle' | 'pågår'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('alle')
  const [subTab, setSubTab] = useState<SubTab>('alle')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [following] = useState<string[]>(['h-001', 'h-005', 'h-012'])

  const allHendelser = useMemo(() => {
    let result = [...mockHendelser]

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
  }, [filters])

  const følgerHendelser = useMemo(() => {
    let result = mockHendelser.filter((h) => following.includes(h.id))
    if (subTab === 'pågår') {
      result = result.filter((h) => h.status === 'pågår')
    }
    result.sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())
    return result
  }, [following, subTab])

  const activeFilterCount =
    filters.fylke_ids.length +
    filters.kommune_ids.length +
    filters.brannvesen_ids.length +
    filters.kategori_ids.length +
    filters.sentral_ids.length +
    (filters.status ? 1 : 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* FØLGER TAB */}
      {activeTab === 'følger' && (
        <>
          <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a]">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-lg font-bold">Jeg følger</h1>
              <button
                onClick={() => { setActiveTab('innstillinger') }}
                className="text-blue-400 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Tilpass
              </button>
            </div>
            <div className="max-w-lg mx-auto px-4 pb-3">
              <div className="flex bg-[#1a1a1a] rounded-lg p-1">
                <button
                  onClick={() => setSubTab('alle')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    subTab === 'alle' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setSubTab('pågår')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    subTab === 'pågår' ? 'bg-blue-500 text-white' : 'text-gray-400'
                  }`}
                >
                  Pågår
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {følgerHendelser.length > 0 ? (
              følgerHendelser.map((h) => (
                <IncidentCard key={h.id} {...h} oppdateringer={h.oppdateringer} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-12">
                {subTab === 'pågår'
                  ? 'Det er ingen pågående hendelser du følger.'
                  : 'Du følger ingen hendelser ennå.'}
              </p>
            )}
            {følgerHendelser.length > 0 && subTab === 'pågår' && (
              <p className="text-center text-gray-500 text-sm py-4">
                Det er ingen flere meldinger å vise.
              </p>
            )}
          </main>
        </>
      )}

      {/* ALLE MELDINGER TAB */}
      {activeTab === 'alle' && (
        <>
          <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a]">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-lg font-bold">Alle meldinger</h1>
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
            </div>
          </header>

          <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {allHendelser.length > 0 ? (
              allHendelser.map((h) => (
                <IncidentCard key={h.id} {...h} oppdateringer={h.oppdateringer} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-12">
                Ingen hendelser funnet med valgte filtre.
              </p>
            )}
          </main>

          <FilterSheet
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </>
      )}

      {/* INNSTILLINGER TAB */}
      {activeTab === 'innstillinger' && <SettingsView />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

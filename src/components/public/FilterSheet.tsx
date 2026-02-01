'use client'

import { useState } from 'react'
import { useFylker, useKommuner, useBrannvesen, useKategorier, useSentraler } from '@/hooks/useSupabaseData'
import { CategoryIcon } from '@/components/ui/CategoryIcon'

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  mode?: 'sheet' | 'sidebar'
}

export interface FilterState {
  fylke_ids: string[]
  kommune_ids: string[]
  brannvesen_ids: string[]
  kategori_ids: string[]
  sentral_ids: string[]
  status: string | null
}

export const emptyFilters: FilterState = {
  fylke_ids: [],
  kommune_ids: [],
  brannvesen_ids: [],
  kategori_ids: [],
  sentral_ids: [],
  status: null,
}

type Section = 'sentral' | 'fylke' | 'brannvesen' | 'kategori' | 'status' | null

export function FilterSheet({ isOpen, onClose, filters, onFiltersChange, mode = 'sheet' }: FilterSheetProps) {
  const isSidebar = mode === 'sidebar'
  const [openSection, setOpenSection] = useState<Section>(null)
  // For mobile sheet, keep old navigation-based view
  const [view, setView] = useState<string>('main')
  const [selectedFylke, setSelectedFylke] = useState<string | null>(null)

  const { data: fylker, loading: loadingFylker } = useFylker()
  const { data: kommuner, loading: loadingKommuner } = useKommuner()
  const { data: brannvesen, loading: loadingBrannvesen } = useBrannvesen()
  const { data: kategorier, loading: loadingKategorier } = useKategorier()
  const { data: sentraler, loading: loadingSentraler } = useSentraler()

  const loading = loadingFylker || loadingKommuner || loadingBrannvesen || loadingKategorier || loadingSentraler

  if (!isSidebar && !isOpen) return null

  if (loading) {
    if (isSidebar) {
      return <div className="h-full flex items-center justify-center"><p className="text-theme-secondary text-sm">Laster...</p></div>
    }
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-theme-overlay" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-theme-card rounded-t-2xl flex flex-col items-center justify-center py-12">
          <p className="text-theme-secondary text-sm">Laster...</p>
        </div>
      </div>
    )
  }

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const arr = filters[key] as string[]
    const newArr = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value]
    onFiltersChange({ ...filters, [key]: newArr })
  }

  const activeFilterCount =
    filters.fylke_ids.length +
    filters.kommune_ids.length +
    filters.brannvesen_ids.length +
    filters.kategori_ids.length +
    filters.sentral_ids.length +
    (filters.status ? 1 : 0)

  const toggleSection = (section: Section) => {
    setOpenSection(openSection === section ? null : section)
  }

  // Helper to get selected names for summary tags
  const getSelectedNames = (ids: string[], items: { id: string; navn?: string; kort_navn?: string }[]) => {
    return ids.map(id => {
      const item = items.find(i => i.id === id)
      return item ? (item.kort_navn || item.navn || id) : id
    })
  }

  // ─── SIDEBAR MODE: Accordion ───
  if (isSidebar) {
    const renderCheckList = (items: { id: string; label: string }[], filterKey: keyof FilterState) => {
      const selected = filters[filterKey] as string[]
      const allSelected = items.length > 0 && items.every(i => selected.includes(i.id))
      const toggleAll = () => {
        if (allSelected) {
          // Remove all items in this list from filter
          onFiltersChange({ ...filters, [filterKey]: selected.filter(id => !items.some(i => i.id === id)) })
        } else {
          // Add all items in this list to filter
          const newIds = [...new Set([...selected, ...items.map(i => i.id)])]
          onFiltersChange({ ...filters, [filterKey]: newIds })
        }
      }
      return (
        <div className="max-h-64 overflow-y-auto py-1">
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-theme-card-hover transition-colors border-b border-theme mb-1"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
              {allSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-medium ${allSelected ? 'text-blue-400' : 'text-theme-secondary'}`}>{allSelected ? 'Fjern alle' : 'Velg alle'}</span>
          </button>
          {items.map(item => {
            const isSelected = selected.includes(item.id)
            return (
              <button
                key={item.id}
                onClick={() => toggleArrayFilter(filterKey, item.id)}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-theme-card-hover transition-colors"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
      )
    }

    const renderSectionHeader = (section: Section, label: string, selectedTags: string[]) => {
      const isOpen = openSection === section
      return (
        <button
          onClick={() => toggleSection(section)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-theme text-left hover:bg-theme-card-hover transition-colors"
        >
          <div className="flex-1 min-w-0">
            <span className="text-sm text-theme">{label}</span>
            {!isOpen && selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">{tag}</span>
                ))}
                {selectedTags.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">+{selectedTags.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <svg className={`w-4 h-4 text-theme-muted transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )
    }

    return (
      <div className="h-full overflow-y-auto bg-theme-card flex flex-col">
        <div className="px-4 py-3 border-b border-theme">
          <h2 className="text-sm font-semibold text-theme">Filter</h2>
        </div>

        {/* 110-sentral */}
        {renderSectionHeader('sentral', '110-sentral', getSelectedNames(filters.sentral_ids, sentraler))}
        {openSection === 'sentral' && renderCheckList(
          sentraler.map(s => ({ id: s.id, label: s.kort_navn })),
          'sentral_ids'
        )}

        {/* Fylke */}
        {renderSectionHeader('fylke', 'Fylke', getSelectedNames(filters.fylke_ids, fylker))}
        {openSection === 'fylke' && renderCheckList(
          fylker.map(f => ({ id: f.id, label: f.navn })),
          'fylke_ids'
        )}

        {/* Brannvesen */}
        {renderSectionHeader('brannvesen', 'Brannvesen', getSelectedNames(filters.brannvesen_ids, brannvesen))}
        {openSection === 'brannvesen' && renderCheckList(
          brannvesen.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => ({ id: b.id, label: b.kort_navn })),
          'brannvesen_ids'
        )}

        {/* Kategori */}
        {renderSectionHeader('kategori', 'Kategori', getSelectedNames(filters.kategori_ids, kategorier))}
        {openSection === 'kategori' && (() => {
          const allKatSelected = kategorier.length > 0 && kategorier.every(k => filters.kategori_ids.includes(k.id))
          const toggleAllKat = () => {
            if (allKatSelected) {
              onFiltersChange({ ...filters, kategori_ids: filters.kategori_ids.filter(id => !kategorier.some(k => k.id === id)) })
            } else {
              onFiltersChange({ ...filters, kategori_ids: [...new Set([...filters.kategori_ids, ...kategorier.map(k => k.id)])] })
            }
          }
          return (
            <div className="max-h-64 overflow-y-auto py-1">
              <button
                onClick={toggleAllKat}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-theme-card-hover transition-colors border-b border-theme mb-1"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allKatSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                  {allKatSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${allKatSelected ? 'text-blue-400' : 'text-theme-secondary'}`}>{allKatSelected ? 'Fjern alle' : 'Velg alle'}</span>
              </button>
              {kategorier.map(kat => {
                const isSelected = filters.kategori_ids.includes(kat.id)
                return (
                  <button
                    key={kat.id}
                    onClick={() => toggleArrayFilter('kategori_ids', kat.id)}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-theme-card-hover transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="shrink-0" style={{ color: kat.farge }}>
                      <CategoryIcon iconName={kat.ikon} className="w-3.5 h-3.5" />
                    </span>
                    <span className={`text-sm ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>{kat.navn}</span>
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Status */}
        {renderSectionHeader('status', 'Status', filters.status ? [filters.status === 'pågår' ? 'Pågår' : 'Avsluttet'] : [])}
        {openSection === 'status' && (
          <div className="py-1">
            {[
              { value: null, label: 'Alle' },
              { value: 'pågår', label: 'Pågår' },
              { value: 'avsluttet', label: 'Avsluttet' },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => onFiltersChange({ ...filters, status: opt.value })}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-theme-card-hover transition-colors"
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${filters.status === opt.value ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                  {filters.status === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-sm ${filters.status === opt.value ? 'text-blue-400' : 'text-gray-300'}`}>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reset */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-3 mt-auto border-t border-theme">
            <button
              onClick={() => onFiltersChange(emptyFilters)}
              className="w-full py-2 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20 hover:bg-red-500/20"
            >
              Nullstill filtre ({activeFilterCount})
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── MOBILE SHEET MODE (unchanged navigation-based) ───
  const filteredKommuner = selectedFylke
    ? kommuner.filter((k) => k.fylke_id === selectedFylke)
    : kommuner

  const filteredBrannvesen = selectedFylke
    ? brannvesen.filter((b) => b.fylke_id === selectedFylke)
    : brannvesen

  const renderMain = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
        <button onClick={onClose} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Lukk
        </button>
        <h2 className="text-base font-semibold">Filter</h2>
        <div className="w-12" />
      </div>

      <div className="p-4 space-y-1">
        {[
          { view: 'sentral', label: '110-sentral', count: filters.sentral_ids.length },
          { view: 'fylke', label: 'Fylke og kommuner', count: filters.fylke_ids.length + filters.kommune_ids.length },
          { view: 'brannvesen', label: 'Brannvesen', count: filters.brannvesen_ids.length },
          { view: 'tema', label: 'Kategori', count: filters.kategori_ids.length },
          { view: 'status', label: 'Status', count: filters.status ? 1 : 0 },
        ].map(item => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className="w-full flex items-center justify-between py-3 border-b border-theme text-left"
          >
            <div>
              <span className="text-white">{item.label}</span>
              {item.count > 0 && <span className="ml-2 text-xs text-blue-400">({item.count} valgt)</span>}
            </div>
            <svg className="w-5 h-5 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {activeFilterCount > 0 && (
        <div className="px-4 pt-2">
          <button onClick={() => onFiltersChange(emptyFilters)} className="w-full py-2 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20 hover:bg-red-500/20">
            Nullstill alle filtre ({activeFilterCount})
          </button>
        </div>
      )}

      <div className="p-4 mt-auto">
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">
          Vis hendelser
        </button>
      </div>
    </>
  )

  const renderListView = (title: string, items: { id: string; navn: string }[], filterKey: keyof FilterState, backView: string = 'main') => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
        <button onClick={() => { setView(backView); setSelectedFylke(null) }} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Tilbake
        </button>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="w-16" />
      </div>
      <div className="overflow-y-auto flex-1 p-4">
        {items.map(item => {
          const isSelected = (filters[filterKey] as string[]).includes(item.id)
          return (
            <button key={item.id} onClick={() => toggleArrayFilter(filterKey, item.id)} className="w-full flex items-center justify-between py-3 border-b border-theme text-left">
              <span className={isSelected ? 'text-blue-400 font-medium' : 'text-theme'}>{item.navn}</span>
              {isSelected && <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
            </button>
          )
        })}
      </div>
      <div className="p-4">
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">Vis hendelser</button>
      </div>
    </>
  )

  const renderFylkeView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
        <button onClick={() => setView('main')} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Tilbake
        </button>
        <h2 className="text-base font-semibold">Fylke</h2>
        <div className="w-16" />
      </div>
      <div className="overflow-y-auto flex-1 p-4">
        {fylker.map(f => {
          const isSelected = filters.fylke_ids.includes(f.id)
          const kommuneCount = kommuner.filter(k => k.fylke_id === f.id).length
          return (
            <div key={f.id} className="border-b border-theme">
              <div className="flex items-center justify-between py-3">
                <button onClick={() => toggleArrayFilter('fylke_ids', f.id)} className={`text-left flex-1 ${isSelected ? 'text-blue-400 font-medium' : 'text-theme'}`}>
                  {f.navn} <span className="text-xs text-theme-muted ml-2">({kommuneCount} kommuner)</span>
                </button>
                <button onClick={() => { setSelectedFylke(f.id); setView('kommune') }} className="text-theme-secondary hover:text-theme p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-4">
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">Vis hendelser</button>
      </div>
    </>
  )

  const renderStatusView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
        <button onClick={() => setView('main')} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Tilbake
        </button>
        <h2 className="text-base font-semibold">Status</h2>
        <div className="w-16" />
      </div>
      <div className="p-4 space-y-1">
        {[{ value: null, label: 'Alle' }, { value: 'pågår', label: 'Pågår' }, { value: 'avsluttet', label: 'Avsluttet' }].map(opt => (
          <button key={opt.label} onClick={() => onFiltersChange({ ...filters, status: opt.value })} className="w-full flex items-center justify-between py-3 border-b border-theme text-left">
            <span className={filters.status === opt.value ? 'text-blue-400 font-medium' : 'text-theme'}>{opt.label}</span>
            {filters.status === opt.value && <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          </button>
        ))}
      </div>
      <div className="p-4 mt-auto">
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">Vis hendelser</button>
      </div>
    </>
  )

  const content = (
    <>
      {view === 'main' && renderMain()}
      {view === 'fylke' && renderFylkeView()}
      {view === 'kommune' && renderListView('Kommuner', filteredKommuner, 'kommune_ids', 'fylke')}
      {view === 'brannvesen' && renderListView('Brannvesen', filteredBrannvesen.map(b => ({ id: b.id, navn: b.kort_navn })), 'brannvesen_ids')}
      {view === 'sentral' && renderListView('110-sentral', sentraler.map(s => ({ id: s.id, navn: s.kort_navn })), 'sentral_ids')}
      {view === 'tema' && (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
            <button onClick={() => setView('main')} className="text-blue-400 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Tilbake
            </button>
            <h2 className="text-base font-semibold">Kategori</h2>
            <div className="w-16" />
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {kategorier.map(kat => {
              const isSelected = filters.kategori_ids.includes(kat.id)
              return (
                <button key={kat.id} onClick={() => toggleArrayFilter('kategori_ids', kat.id)} className="w-full flex items-center justify-between py-3 border-b border-theme text-left">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0" style={{ color: kat.farge }}>
                      <CategoryIcon iconName={kat.ikon} className="w-4 h-4" />
                    </span>
                    <span className={isSelected ? 'text-blue-400 font-medium' : 'text-theme'}>{kat.navn}</span>
                  </div>
                  {isSelected && <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
              )
            })}
          </div>
          <div className="p-4">
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">Vis hendelser</button>
          </div>
        </>
      )}
      {view === 'status' && renderStatusView()}
    </>
  )

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-theme-overlay" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-theme-card rounded-t-2xl flex flex-col">
        <div className="w-10 h-1 bg-theme-card-hover rounded-full mx-auto mt-3 mb-1" />
        {content}
      </div>
    </div>
  )
}

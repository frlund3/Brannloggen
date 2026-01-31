'use client'

import { useState } from 'react'
import { fylker } from '@/data/fylker'
import { kommuner } from '@/data/kommuner'
import { brannvesen } from '@/data/brannvesen'
import { kategorier } from '@/data/kategorier'

interface FilterSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export interface FilterState {
  fylke_ids: string[]
  kommune_ids: string[]
  brannvesen_ids: string[]
  kategori_ids: string[]
  status: string | null
}

export const emptyFilters: FilterState = {
  fylke_ids: [],
  kommune_ids: [],
  brannvesen_ids: [],
  kategori_ids: [],
  status: null,
}

type View = 'main' | 'fylke' | 'kommune' | 'brannvesen' | 'tema' | 'status'

export function FilterSheet({ isOpen, onClose, filters, onFiltersChange }: FilterSheetProps) {
  const [view, setView] = useState<View>('main')
  const [selectedFylke, setSelectedFylke] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredKommuner = selectedFylke
    ? kommuner.filter((k) => k.fylke_id === selectedFylke)
    : kommuner

  const filteredBrannvesen = selectedFylke
    ? brannvesen.filter((b) => b.fylke_id === selectedFylke)
    : brannvesen

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
    (filters.status ? 1 : 0)

  const renderMain = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
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
        <button
          onClick={() => setView('fylke')}
          className="w-full flex items-center justify-between py-3 border-b border-[#2a2a2a] text-left"
        >
          <div>
            <span className="text-white">Fylke og kommuner</span>
            {(filters.fylke_ids.length > 0 || filters.kommune_ids.length > 0) && (
              <span className="ml-2 text-xs text-blue-400">
                ({filters.fylke_ids.length + filters.kommune_ids.length} valgt)
              </span>
            )}
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setView('brannvesen')}
          className="w-full flex items-center justify-between py-3 border-b border-[#2a2a2a] text-left"
        >
          <div>
            <span className="text-white">Brannvesen</span>
            {filters.brannvesen_ids.length > 0 && (
              <span className="ml-2 text-xs text-blue-400">
                ({filters.brannvesen_ids.length} valgt)
              </span>
            )}
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setView('tema')}
          className="w-full flex items-center justify-between py-3 border-b border-[#2a2a2a] text-left"
        >
          <div>
            <span className="text-white">Kategori</span>
            {filters.kategori_ids.length > 0 && (
              <span className="ml-2 text-xs text-blue-400">
                ({filters.kategori_ids.length} valgt)
              </span>
            )}
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setView('status')}
          className="w-full flex items-center justify-between py-3 border-b border-[#2a2a2a] text-left"
        >
          <div>
            <span className="text-white">Status</span>
            {filters.status && (
              <span className="ml-2 text-xs text-blue-400">
                ({filters.status === 'pågår' ? 'Pågår' : 'Avsluttet'})
              </span>
            )}
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="px-4 pt-2">
          <button
            onClick={() => onFiltersChange(emptyFilters)}
            className="w-full py-2 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20 hover:bg-red-500/20"
          >
            Nullstill alle filtre ({activeFilterCount})
          </button>
        </div>
      )}

      <div className="p-4 mt-auto">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
        >
          Vis hendelser
        </button>
      </div>
    </>
  )

  const renderListView = (
    title: string,
    items: { id: string; navn: string }[],
    filterKey: keyof FilterState,
    backView: View = 'main'
  ) => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <button onClick={() => { setView(backView); setSelectedFylke(null); }} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake
        </button>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="w-16" />
      </div>

      <div className="overflow-y-auto flex-1 p-4">
        {items.map((item) => {
          const isSelected = (filters[filterKey] as string[]).includes(item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggleArrayFilter(filterKey, item.id)}
              className="w-full flex items-center justify-between py-3 border-b border-[#2a2a2a] text-left"
            >
              <span className={isSelected ? 'text-blue-400 font-medium' : 'text-white'}>{item.navn}</span>
              {isSelected && (
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      <div className="p-4">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
        >
          Vis hendelser
        </button>
      </div>
    </>
  )

  const renderFylkeView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <button onClick={() => setView('main')} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake
        </button>
        <h2 className="text-base font-semibold">Fylke</h2>
        <div className="w-16" />
      </div>

      <div className="overflow-y-auto flex-1 p-4">
        {fylker.map((f) => {
          const isSelected = filters.fylke_ids.includes(f.id)
          const kommuneCount = kommuner.filter((k) => k.fylke_id === f.id).length
          return (
            <div key={f.id} className="border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between py-3">
                <button
                  onClick={() => toggleArrayFilter('fylke_ids', f.id)}
                  className={`text-left flex-1 ${isSelected ? 'text-blue-400 font-medium' : 'text-white'}`}
                >
                  {f.navn}
                  <span className="text-xs text-gray-500 ml-2">({kommuneCount} kommuner)</span>
                </button>
                <button
                  onClick={() => { setSelectedFylke(f.id); setView('kommune') }}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-4">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
        >
          Vis hendelser
        </button>
      </div>
    </>
  )

  const renderStatusView = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <button onClick={() => setView('main')} className="text-blue-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tilbake
        </button>
        <h2 className="text-base font-semibold">Status</h2>
        <div className="w-16" />
      </div>

      <div className="p-4 space-y-1">
        {[
          { value: null, label: 'Alle' },
          { value: 'pågår', label: 'Pågår' },
          { value: 'avsluttet', label: 'Avsluttet' },
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() => onFiltersChange({ ...filters, status: opt.value })}
            className="w-full flex items-center justify-between py-3 border-b border-[#2a2a2a] text-left"
          >
            <span className={filters.status === opt.value ? 'text-blue-400 font-medium' : 'text-white'}>
              {opt.label}
            </span>
            {filters.status === opt.value && (
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 mt-auto">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
        >
          Vis hendelser
        </button>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-[#1a1a1a] rounded-t-2xl flex flex-col">
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-3 mb-1" />

        {view === 'main' && renderMain()}
        {view === 'fylke' && renderFylkeView()}
        {view === 'kommune' && renderListView('Kommuner', filteredKommuner, 'kommune_ids', 'fylke')}
        {view === 'brannvesen' && renderListView('Brannvesen', filteredBrannvesen.map(b => ({ id: b.id, navn: b.kort_navn })), 'brannvesen_ids')}
        {view === 'tema' && renderListView('Kategori', kategorier.map(k => ({ id: k.id, navn: k.navn })), 'kategori_ids')}
        {view === 'status' && renderStatusView()}
      </div>
    </div>
  )
}

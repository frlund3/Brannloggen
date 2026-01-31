'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { mockHendelser } from '@/data/mock-hendelser'
import { brannvesen } from '@/data/brannvesen'
import { kategorier } from '@/data/kategorier'
import { fylker } from '@/data/fylker'
import { kommuner } from '@/data/kommuner'
import { sentraler } from '@/data/sentraler'
import { formatDateTime } from '@/lib/utils'
import { useSentralScope } from '@/hooks/useSentralScope'
import Link from 'next/link'
import { useState, useMemo } from 'react'

export default function OperatorHendelserPage() {
  const { isAdmin, is110Admin, isScoped, hasAdminAccess, filterByBrannvesen } = useSentralScope()
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterFylke, setFilterFylke] = useState('')
  const [filterKommune, setFilterKommune] = useState('')
  const [filterBrannvesen, setFilterBrannvesen] = useState('')
  const [filterSentral, setFilterSentral] = useState('')
  const [filterAlvor, setFilterAlvor] = useState('')
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([])
  const [deactivateConfirm, setDeactivateConfirm] = useState<string | null>(null)
  const [selectedHendelse, setSelectedHendelse] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [newUpdate, setNewUpdate] = useState('')

  // Scope hendelser for 110-admin
  const scopedHendelser = useMemo(() => {
    return isScoped ? filterByBrannvesen(mockHendelser) : mockHendelser
  }, [isScoped, filterByBrannvesen])

  const filteredKommuner = filterFylke ? kommuner.filter(k => k.fylke_id === filterFylke) : kommuner
  const filteredBrannvesenList = filterSentral
    ? brannvesen.filter(b => sentraler.find(s => s.id === filterSentral)?.brannvesen_ids.includes(b.id))
    : filterFylke
    ? brannvesen.filter(b => b.fylke_id === filterFylke)
    : brannvesen

  const hendelser = scopedHendelser
    .filter((h) => {
      if (deactivatedIds.includes(h.id)) return false
      if (statusFilter !== 'alle' && h.status !== statusFilter) return false
      if (search && !h.tittel.toLowerCase().includes(search.toLowerCase()) && !h.sted.toLowerCase().includes(search.toLowerCase())) return false
      if (filterKategori && h.kategori_id !== filterKategori) return false
      if (filterFylke && h.fylke_id !== filterFylke) return false
      if (filterKommune && h.kommune_id !== filterKommune) return false
      if (filterBrannvesen && h.brannvesen_id !== filterBrannvesen) return false
      if (filterAlvor && h.alvorlighetsgrad !== filterAlvor) return false
      if (filterSentral) {
        const sentral = sentraler.find(s => s.id === filterSentral)
        if (sentral && !sentral.brannvesen_ids.includes(h.brannvesen_id)) return false
      }
      return true
    })
    .sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())

  const activeFilterCount = [filterKategori, filterFylke, filterKommune, filterBrannvesen, filterSentral, filterAlvor].filter(Boolean).length

  const clearFilters = () => {
    setSearch('')
    setFilterKategori('')
    setFilterFylke('')
    setFilterKommune('')
    setFilterBrannvesen('')
    setFilterSentral('')
    setFilterAlvor('')
  }

  const handleDeactivate = (id: string) => {
    setDeactivatedIds([...deactivatedIds, id])
    setDeactivateConfirm(null)
  }

  const selectedH = selectedHendelse ? mockHendelser.find(h => h.id === selectedHendelse) : null

  const layoutRole = isAdmin ? 'admin' as const : is110Admin ? '110-admin' as const : 'operator' as const

  return (
    <DashboardLayout role={layoutRole}>
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Hendelser</h1>
            <p className="text-sm text-gray-400">
              {isScoped ? 'Hendelser for dine 110-sentraler' : 'Administrer hendelser'}
            </p>
          </div>
          <Link href="/operator/hendelser/ny" className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny hendelse
          </Link>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'alle', label: 'Alle' },
            { value: 'pågår', label: 'Pågår' },
            { value: 'avsluttet', label: 'Avsluttet' },
          ].map((tab) => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.value ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'}`}>
              {tab.label}
              <span className="ml-1.5 text-xs">({tab.value === 'alle' ? scopedHendelser.filter(h => !deactivatedIds.includes(h.id)).length : scopedHendelser.filter((h) => h.status === tab.value && !deactivatedIds.includes(h.id)).length})</span>
            </button>
          ))}
          {deactivatedIds.length > 0 && (
            <span className="px-3 py-2 text-xs text-gray-500 flex items-center">
              {deactivatedIds.length} deaktivert
            </span>
          )}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk på tittel eller sted..." className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
          <div className="flex gap-2 flex-wrap">
            <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle kategorier</option>
              {kategorier.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
            </select>
            <select value={filterAlvor} onChange={(e) => setFilterAlvor(e.target.value)} className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle alvorlighetsgrader</option>
              <option value="lav">Lav</option>
              <option value="middels">Middels</option>
              <option value="høy">Høy</option>
              <option value="kritisk">Kritisk</option>
            </select>
            <select value={filterSentral} onChange={(e) => setFilterSentral(e.target.value)} className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle 110-sentraler</option>
              {sentraler.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
            </select>
            <select value={filterFylke} onChange={(e) => { setFilterFylke(e.target.value); setFilterKommune(''); setFilterBrannvesen('') }} className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle fylker</option>
              {fylker.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
            </select>
            {filterFylke && (
              <select value={filterKommune} onChange={(e) => setFilterKommune(e.target.value)} className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
                <option value="">Alle kommuner</option>
                {filteredKommuner.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
              </select>
            )}
            <select value={filterBrannvesen} onChange={(e) => setFilterBrannvesen(e.target.value)} className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle brannvesen</option>
              {filteredBrannvesenList.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="px-3 py-2 text-xs text-red-400 hover:text-red-300">Nullstill filtre ({activeFilterCount})</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tittel</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">110-sentral</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Alvor</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Opprettet</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {hendelser.map((h) => {
                  const bv = brannvesen.find((b) => b.id === h.brannvesen_id)
                  const sentral = sentraler.find((s) => s.brannvesen_ids.includes(h.brannvesen_id))
                  const kat = kategorier.find((k) => k.id === h.kategori_id)
                  return (
                    <tr key={h.id} className="border-b border-[#2a2a2a] hover:bg-[#222] transition-colors">
                      <td className="px-4 py-3"><StatusBadge status={h.status} size="sm" /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelectedHendelse(h.id); setEditStatus(h.status); setNewUpdate('') }} className="text-sm text-white hover:text-blue-400 font-medium text-left">{h.tittel}</button>
                        <p className="text-xs text-gray-500 mt-0.5">{h.sted}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {kat && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: kat.farge + '22', color: kat.farge }}>{kat.navn}</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-gray-400">{sentral?.kort_navn || bv?.kort_navn}</span></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><SeverityDot severity={h.alvorlighetsgrad} showLabel /></td>
                      <td className="px-4 py-3"><span className="text-xs text-gray-400">{formatDateTime(h.opprettet_tidspunkt)}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelectedHendelse(h.id); setEditStatus(h.status); setNewUpdate('') }} className="text-xs text-blue-400 hover:text-blue-300">Detaljer</button>
                          {hasAdminAccess && (
                            <button onClick={() => setDeactivateConfirm(h.id)} className="text-xs text-red-400 hover:text-red-300">Deaktiver</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#2a2a2a]">
            <p className="text-xs text-gray-500">Viser {hendelser.length} av {scopedHendelser.filter(h => !deactivatedIds.includes(h.id)).length} hendelser</p>
          </div>
        </div>
      </div>

      {/* Deactivate confirm modal */}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeactivateConfirm(null)} />
          <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-white mb-2">Deaktiver hendelse?</h2>
            <p className="text-sm text-gray-400 mb-2">
              {mockHendelser.find(h => h.id === deactivateConfirm)?.tittel}
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Hendelsen vil bli skjult fra oversikten. Den kan ikke vises igjen uten en administrator.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDeactivate(deactivateConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">Deaktiver</button>
              <button onClick={() => setDeactivateConfirm(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Hendelse detail / edit modal */}
      {selectedH && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedHendelse(null)} />
          <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedH.tittel}</h2>
                <p className="text-xs text-gray-500 mt-1">{selectedH.sted}</p>
              </div>
              <button onClick={() => setSelectedHendelse(null)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#0a0a0a] rounded-lg p-3">
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={selectedH.status} size="sm" />
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-3">
                <p className="text-xs text-gray-500">Alvorlighetsgrad</p>
                <SeverityDot severity={selectedH.alvorlighetsgrad} showLabel />
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-3">
                <p className="text-xs text-gray-500">Kategori</p>
                <p className="text-sm text-white">{kategorier.find(k => k.id === selectedH.kategori_id)?.navn || '-'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-3">
                <p className="text-xs text-gray-500">110-sentral</p>
                <p className="text-sm text-white">{sentraler.find(s => s.brannvesen_ids.includes(selectedH.brannvesen_id))?.kort_navn || brannvesen.find(b => b.id === selectedH.brannvesen_id)?.kort_navn || '-'}</p>
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Beskrivelse</p>
              <p className="text-sm text-gray-300">{selectedH.beskrivelse}</p>
            </div>

            {/* Change status */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Endre status</label>
              <div className="flex gap-2">
                {['pågår', 'avsluttet'].map(s => (
                  <button key={s} onClick={() => setEditStatus(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editStatus === s ? (s === 'pågår' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30') : 'bg-[#0a0a0a] text-gray-400 border border-[#2a2a2a]'}`}>
                    {s === 'pågår' ? 'Pågår' : 'Avsluttet'}
                  </button>
                ))}
              </div>
            </div>

            {/* Add update */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Legg til oppdatering</label>
              <textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="Skriv en oppdatering..." className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 h-20 resize-none" />
            </div>

            {/* Existing updates */}
            {selectedH.oppdateringer.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Oppdateringer ({selectedH.oppdateringer.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedH.oppdateringer.map(u => (
                    <div key={u.id} className="bg-[#0a0a0a] rounded-lg p-3">
                      <p className="text-sm text-gray-300">{u.tekst}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(u.opprettet_tidspunkt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setSelectedHendelse(null)} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Lagre endringer</button>
              <button onClick={() => setSelectedHendelse(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Lukk</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

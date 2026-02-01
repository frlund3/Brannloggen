'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useHendelser, useBrannvesen, useKategorier, useBrukerprofiler } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { useSentralScope } from '@/hooks/useSentralScope'
import { formatTime, formatDateTime, formatDuration } from '@/lib/utils'
import { useState, useMemo } from 'react'
import type { Hendelse } from '@/hooks/useSupabaseData'

type StatusFilter = 'alle' | 'pågår' | 'avsluttet'

export default function NyVisningPage() {
  const { data: hendelser, loading: hendelserLoading, refetch } = useHendelser()
  useRealtimeHendelser(refetch)
  const { data: brannvesen, loading: bvLoading } = useBrannvesen()
  const { data: kategorier, loading: katLoading } = useKategorier()
  const { data: brukerprofiler, loading: brukereLoading } = useBrukerprofiler()
  const { is110Admin } = useSentralScope()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')

  const loading = hendelserLoading || bvLoading || katLoading || brukereLoading

  const getUserName = (userId: string) => {
    const profil = brukerprofiler.find(b => b.user_id === userId)
    return profil?.fullt_navn || null
  }

  const filtered = useMemo(() => {
    let result = hendelser.filter(h => h.status !== 'deaktivert')
    if (statusFilter !== 'alle') {
      result = result.filter(h => h.status === statusFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(h =>
        h.tittel.toLowerCase().includes(q) ||
        h.sted.toLowerCase().includes(q) ||
        h.beskrivelse.toLowerCase().includes(q)
      )
    }
    return result
  }, [hendelser, statusFilter, search])

  const selected: Hendelse | null = selectedId ? filtered.find(h => h.id === selectedId) || null : null

  const getKat = (id: string) => kategorier.find(k => k.id === id)
  const getBv = (id: string) => brannvesen.find(b => b.id === id)

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pågår': return 'Aktiv'
      case 'avsluttet': return 'Avsluttet'
      default: return s
    }
  }
  const statusColor = (s: string) => {
    switch (s) {
      case 'pågår': return 'bg-green-500/20 text-green-400 border-green-500/40'
      case 'avsluttet': return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
    }
  }

  if (loading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="flex h-[calc(100vh-57px)] lg:h-screen overflow-hidden">
        {/* Left panel: incident list */}
        <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-[#2a2a2a] flex flex-col shrink-0" style={selected ? { display: 'none' } : undefined}>
          {/* Search */}
          <div className="p-3 border-b border-[#2a2a2a]">
            <div className="relative">
              <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Søk..."
                className="w-full pl-9 pr-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Header */}
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <h1 className="text-lg font-bold text-white">Logg</h1>
            <div className="flex gap-2 mt-2">
              {(['alle', 'pågår', 'avsluttet'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === s
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  {s === 'alle' ? `Alle (${hendelser.filter(h => h.status !== 'deaktivert').length})` :
                   s === 'pågår' ? `Aktiv (${hendelser.filter(h => h.status === 'pågår').length})` :
                   `Avsluttet (${hendelser.filter(h => h.status === 'avsluttet').length})`}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(h => {
              const kat = getKat(h.kategori_id)
              const bv = getBv(h.brannvesen_id)
              const isSelected = selectedId === h.id
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedId(h.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[#1a1a1a] transition-colors ${
                    isSelected ? 'bg-blue-500/10' : 'hover:bg-[#111]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{formatTime(h.opprettet_tidspunkt)}</span>
                        <span>&middot;</span>
                        <span>{new Date(h.opprettet_tidspunkt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>&middot;</span>
                        <span className={h.status === 'avsluttet' ? 'text-gray-500' : 'text-amber-400'}>{formatDuration(h.opprettet_tidspunkt, h.avsluttet_tidspunkt)}</span>
                        {kat && <span>&middot; {kat.navn}</span>}
                      </div>
                      <p className="text-sm text-white font-medium truncate">{h.tittel}</p>
                      <p className="text-xs text-gray-500 truncate">{bv?.kort_navn} &middot; {h.sted}</p>
                      {getUserName(h.opprettet_av) && (
                        <p className="text-xs text-gray-600 mt-0.5">Av: {getUserName(h.opprettet_av)}</p>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${statusColor(h.status)}`}>
                      {statusLabel(h.status)}
                    </span>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">Ingen hendelser funnet</div>
            )}
          </div>
        </div>

        {/* Desktop: always show list */}
        <style>{`@media (min-width: 1024px) { [style*="display: none"] { display: flex !important; } }`}</style>

        {/* Right panel: detail */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Velg en hendelse fra listen
            </div>
          ) : (
            <div className="p-4 lg:p-6 max-w-4xl">
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedId(null)}
                className="lg:hidden text-sm text-blue-400 mb-4 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Tilbake
              </button>

              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 flex-wrap">
                    <span>{formatDateTime(selected.opprettet_tidspunkt)}</span>
                    <span>&middot;</span>
                    <span className={selected.status === 'avsluttet' ? 'text-gray-500' : 'text-amber-400 font-medium'}>
                      Varighet: {formatDuration(selected.opprettet_tidspunkt, selected.avsluttet_tidspunkt)}
                    </span>
                    <span>&middot;</span>
                    <span>{getKat(selected.kategori_id)?.navn}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selected.tittel}</h2>
                  <p className="text-sm text-gray-400 mt-1">{getBv(selected.brannvesen_id)?.kort_navn} &middot; {selected.sted}</p>
                  {getUserName(selected.opprettet_av) && (
                    <p className="text-xs text-gray-500 mt-1">Opprettet av: {getUserName(selected.opprettet_av)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-3 py-1 rounded border ${statusColor(selected.status)}`}>
                    {statusLabel(selected.status)}
                  </span>
                  <a
                    href={`/operator/hendelser/${selected.id}`}
                    className="text-xs px-3 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                  >
                    Oppdater hendelsen
                  </a>
                </div>
              </div>

              {/* Description */}
              <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 mb-6">
                <p className="text-sm text-white leading-relaxed">{selected.beskrivelse}</p>
                {selected.bilde_url && (
                  <img src={selected.bilde_url} alt="" className="mt-3 rounded-lg max-h-64 object-cover" />
                )}
              </div>

              {/* Two columns: PRESSE and PUBLIKUM */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* PRESSE column */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Presse</span>
                    <span className="text-xs text-amber-400/60">
                      {(selected.presseoppdateringer || []).filter(p => !p.deaktivert).length} oppdateringer
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {selected.presse_tekst && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                        <span className="text-[10px] text-amber-400/60 uppercase tracking-wider">Pressemelding</span>
                        <p className="text-sm text-white mt-1">{selected.presse_tekst}</p>
                      </div>
                    )}
                    {(selected.presseoppdateringer || []).filter(p => !p.deaktivert).map(p => (
                      <div key={p.id} className="border-l-2 border-amber-500/30 pl-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatTime(p.opprettet_tidspunkt)} &middot; {new Date(p.opprettet_tidspunkt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p className="text-sm text-white mt-0.5">{p.tekst}</p>
                        {p.bilde_url && (
                          <img src={p.bilde_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                        )}
                        {getUserName(p.opprettet_av) && (
                          <p className="text-xs text-gray-600 mt-0.5">Av: {getUserName(p.opprettet_av)}</p>
                        )}
                      </div>
                    ))}
                    {!selected.presse_tekst && (selected.presseoppdateringer || []).filter(p => !p.deaktivert).length === 0 && (
                      <p className="text-xs text-gray-500">Ingen presseoppdateringer</p>
                    )}
                  </div>
                </div>

                {/* PUBLIKUM column */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Publikum</span>
                    <span className="text-xs text-blue-400/60">
                      {(selected.oppdateringer || []).filter(o => !o.deaktivert).length} oppdateringer
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {(selected.oppdateringer || []).filter(o => !o.deaktivert).map(o => (
                      <div key={o.id} className="border-l-2 border-blue-500/30 pl-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatTime(o.opprettet_tidspunkt)} &middot; {new Date(o.opprettet_tidspunkt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p className="text-sm text-white mt-0.5">{o.tekst}</p>
                        {o.bilde_url && (
                          <img src={o.bilde_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                        )}
                        {getUserName(o.opprettet_av) && (
                          <p className="text-xs text-gray-600 mt-0.5">Av: {getUserName(o.opprettet_av)}</p>
                        )}
                      </div>
                    ))}
                    {(selected.oppdateringer || []).filter(o => !o.deaktivert).length === 0 && (
                      <p className="text-xs text-gray-500">Ingen publikumsoppdateringer</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Internal notes */}
              {(selected.interne_notater || []).filter(n => !n.deaktivert).length > 0 && (
                <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                    <span className="text-xs font-bold text-yellow-400 tracking-wider uppercase">Interne notater</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {(selected.interne_notater || []).filter(n => !n.deaktivert).map(n => (
                      <div key={n.id} className="border-l-2 border-yellow-500/30 pl-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatTime(n.opprettet_tidspunkt)} &middot; {new Date(n.opprettet_tidspunkt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <p className="text-sm text-white mt-0.5">{n.notat}</p>
                        {n.bilde_url && (
                          <img src={n.bilde_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                        )}
                        {getUserName(n.opprettet_av) && (
                          <p className="text-xs text-gray-600 mt-0.5">Av: {getUserName(n.opprettet_av)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

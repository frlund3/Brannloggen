'use client'

import { PresseLayout } from '@/components/presse/PresseLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useHendelser, useBrannvesen, useKommuner, useKategorier, useFylker, useSentraler } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { formatDateTime, formatTime, formatTimeAgo } from '@/lib/utils'
import { useState } from 'react'

export default function PresseHendelserPage() {
  const { data: hendelser, loading: hendelserLoading, refetch } = useHendelser({ excludeDeactivated: true })
  useRealtimeHendelser(refetch)
  const { data: brannvesen } = useBrannvesen()
  const { data: kommuner } = useKommuner()
  const { data: kategorier } = useKategorier()
  const { data: fylker } = useFylker()
  const { data: sentraler } = useSentraler()
  const [filter, setFilter] = useState<'alle' | 'pågår' | 'avsluttet'>('alle')
  const [selectedFylke, setSelectedFylke] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (hendelserLoading) {
    return (
      <PresseLayout>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </PresseLayout>
    )
  }

  const filtered = hendelser.filter((h) => {
    if (filter !== 'alle' && h.status !== filter) return false
    if (selectedFylke && h.fylke_id !== selectedFylke) return false
    if (selectedKategori && h.kategori_id !== selectedKategori) return false
    if (search && !h.tittel.toLowerCase().includes(search.toLowerCase()) && !h.sted.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <PresseLayout>
      <div className="py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Hendelser</h1>
          <p className="text-sm text-gray-400">Presseoversikt med utvidet informasjon</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden w-fit">
            {(['alle', 'pågår', 'avsluttet'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 text-sm capitalize transition-colors touch-manipulation ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'alle' ? `Alle (${hendelser.length})` : f === 'pågår' ? `Pågår (${hendelser.filter(h => h.status === 'pågår').length})` : `Avsluttet (${hendelser.filter(h => h.status === 'avsluttet').length})`}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk på tittel eller sted..."
              className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <select
              value={selectedFylke}
              onChange={(e) => setSelectedFylke(e.target.value)}
              className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Alle fylker</option>
              {fylker.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((f) => (
                <option key={f.id} value={f.id}>{f.navn}</option>
              ))}
            </select>
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Alle kategorier</option>
              {kategorier.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((k) => (
                <option key={k.id} value={k.id}>{k.navn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Totalt</p>
            <p className="text-2xl font-bold text-white">{hendelser.length}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Pågår nå</p>
            <p className="text-2xl font-bold text-red-400">{hendelser.filter(h => h.status === 'pågår').length}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Siste 24t</p>
            <p className="text-2xl font-bold text-blue-400">{hendelser.filter(h => {
              const t = new Date(h.opprettet_tidspunkt).getTime()
              return Date.now() - t < 24 * 60 * 60 * 1000
            }).length}</p>
          </div>
        </div>

        {/* Incident list */}
        <div className="space-y-4">
          {filtered.map((h) => {
            const bv = brannvesen.find((b) => b.id === h.brannvesen_id)
            const kommune = kommuner.find((k) => k.id === h.kommune_id)
            const fylke = fylker.find((f) => f.id === h.fylke_id)
            const kat = kategorier.find((k) => k.id === h.kategori_id)
            const sentral = sentraler.find(s => s.brannvesen_ids.includes(h.brannvesen_id))
            const isExpanded = expandedId === h.id
            const activeUpdates = h.oppdateringer?.filter(u => !u.deaktivert) || []
            const activePresse = h.presseoppdateringer?.filter(p => !p.deaktivert) || []
            const hasPresse = !!h.presse_tekst || activePresse.length > 0

            return (
              <div
                key={h.id}
                className={`bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden border-l-4 ${
                  h.status === 'pågår' ? 'border-l-red-500' : h.status === 'avsluttet' ? 'border-l-green-500' : 'border-l-gray-600'
                }`}
              >
                {/* Card header - always visible */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#222] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : h.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">{sentral?.kort_navn || bv?.kort_navn}</span>
                      <span className="text-xs text-gray-500">&middot;</span>
                      <span className="text-xs text-gray-400">{kommune?.navn}, {fylke?.navn}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={h.status} />
                      <SeverityDot severity={h.alvorlighetsgrad} showLabel />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{h.tittel}</h3>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-gray-500">{formatDateTime(h.opprettet_tidspunkt)}</span>
                    {h.oppdatert_tidspunkt !== h.opprettet_tidspunkt && (
                      <span className="text-xs text-gray-600">Sist redigert {formatTimeAgo(h.oppdatert_tidspunkt)}</span>
                    )}
                    {kat && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                        style={{ backgroundColor: kat.farge + '22', color: kat.farge }}
                      >
                        <CategoryIcon iconName={kat.ikon} className="w-3 h-3" />
                        {kat.navn}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-300">{h.beskrivelse}</p>

                  {/* Hendelsebilde */}
                  {h.bilde_url && (
                    <img src={h.bilde_url} alt="" className="mt-3 rounded-lg max-h-64 object-cover" />
                  )}

                  {/* Summary badges */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {activeUpdates.length > 0 && (
                      <span className="text-xs text-blue-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {activeUpdates.length} oppdatering{activeUpdates.length !== 1 ? 'er' : ''}
                      </span>
                    )}
                    {hasPresse && (
                      <span className="text-xs text-cyan-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                        Presseinformasjon
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded view with ALL details */}
                {isExpanded && (() => {
                  // Merge all updates into one unified timeline
                  const timelineItems: { id: string; type: 'publikum' | 'presse' | 'status'; tekst: string; opprettet_tidspunkt: string; opprettet_av?: string; bilde_url?: string | null }[] = [
                    { id: 'opprettet', type: 'status', tekst: 'Hendelsen ble opprettet', opprettet_tidspunkt: h.opprettet_tidspunkt, opprettet_av: h.opprettet_av },
                    ...activeUpdates.map(u => ({ id: u.id, type: 'publikum' as const, tekst: u.tekst, opprettet_tidspunkt: u.opprettet_tidspunkt, opprettet_av: u.opprettet_av, bilde_url: u.bilde_url })),
                    ...activePresse.map(p => ({ id: p.id, type: 'presse' as const, tekst: p.tekst, opprettet_tidspunkt: p.opprettet_tidspunkt, opprettet_av: p.opprettet_av, bilde_url: p.bilde_url })),
                  ]
                  if (h.status === 'avsluttet' && h.avsluttet_tidspunkt) {
                    timelineItems.push({ id: 'status-avsluttet', type: 'status', tekst: 'Hendelsen ble avsluttet', opprettet_tidspunkt: h.avsluttet_tidspunkt })
                  }
                  timelineItems.sort((a, b) => new Date(a.opprettet_tidspunkt).getTime() - new Date(b.opprettet_tidspunkt).getTime())

                  return (
                  <div className="border-t border-[#2a2a2a] p-4 space-y-5">

                    {/* ── Hovedpressemelding ── */}
                    {h.presse_tekst && (
                      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] text-cyan-500/60 uppercase font-semibold">Hovedpressemelding</p>
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold">KUN PRESSE</span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-line">{h.presse_tekst}</p>
                      </div>
                    )}

                    {/* ── Unified timeline ── */}
                    {timelineItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Tidslinje ({timelineItems.length} oppdatering{timelineItems.length !== 1 ? 'er' : ''})
                        </h4>
                        <div className="relative ml-1">
                          {timelineItems.map((item, i) => {
                            const cfgMap = {
                              publikum: { dot: 'border-blue-500', badge: 'bg-blue-500/15 text-blue-400', label: 'Publikum', textColor: 'text-gray-300' },
                              presse: { dot: 'border-cyan-500', badge: 'bg-cyan-500/20 text-cyan-400', label: 'KUN PRESSE', textColor: 'text-cyan-100' },
                              status: { dot: 'border-gray-500', badge: 'bg-gray-500/20 text-gray-400', label: 'Status', textColor: 'text-gray-400' },
                            }
                            const cfg = cfgMap[item.type]
                            const nextCfg = i < timelineItems.length - 1 ? cfgMap[timelineItems[i + 1].type] : null

                            return (
                              <div key={item.id} className="relative pl-5 pb-4 last:pb-0">
                                {nextCfg && (
                                  <div className={`absolute left-[5px] top-[10px] bottom-0 w-px ${
                                    timelineItems[i + 1].type === 'presse' ? 'bg-cyan-500/30' : timelineItems[i + 1].type === 'publikum' ? 'bg-blue-500/30' : 'bg-gray-500/30'
                                  }`} />
                                )}
                                <div className={`absolute left-0 top-[6px] w-[11px] h-[11px] rounded-full border-2 ${cfg.dot} bg-[#1a1a1a]`} />
                                {item.type === 'status' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{formatTime(item.opprettet_tidspunkt)}</span>
                                    <span className="text-xs text-gray-400 italic">{item.tekst}</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-gray-500">{formatTime(item.opprettet_tidspunkt)}</span>
                                      <span className="text-xs text-gray-600">{formatDateTime(item.opprettet_tidspunkt)}</span>
                                      <span className={`text-[10px] ${cfg.badge} px-1.5 py-0.5 rounded font-bold`}>{cfg.label}</span>
                                    </div>
                                    <p className={`text-sm mt-0.5 ${cfg.textColor}`}>{item.tekst}</p>
                                    {item.bilde_url && (
                                      <img src={item.bilde_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Full details grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#111] rounded-lg p-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sted</p>
                        <p className="text-sm text-white">{h.sted}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">110-sentral</p>
                        <p className="text-sm text-white">{sentral?.kort_navn || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Brannvesen</p>
                        <p className="text-sm text-white">{bv?.navn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Kommune / Fylke</p>
                        <p className="text-sm text-white">{kommune?.navn}, {fylke?.navn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Opprettet</p>
                        <p className="text-sm text-white">{formatDateTime(h.opprettet_tidspunkt)}</p>
                      </div>
                      {h.avsluttet_tidspunkt && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Avsluttet</p>
                          <p className="text-sm text-white">{formatDateTime(h.avsluttet_tidspunkt)}</p>
                        </div>
                      )}
                      {h.latitude && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Koordinater</p>
                          <p className="text-sm text-white">{h.latitude}, {h.longitude}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })()}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Ingen hendelser matcher filteret.
            </div>
          )}
        </div>
      </div>
    </PresseLayout>
  )
}

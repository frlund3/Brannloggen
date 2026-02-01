'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { useHendelser, useBrannvesen, useKommuner, useKategorier, useFylker } from '@/hooks/useSupabaseData'
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
  const [filter, setFilter] = useState<'alle' | 'pågår' | 'avsluttet'>('alle')
  const [selectedFylke, setSelectedFylke] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (hendelserLoading) {
    return (
      <DashboardLayout role="presse">
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </DashboardLayout>
    )
  }

  const filtered = hendelser.filter((h) => {
    if (filter !== 'alle' && h.status !== filter) return false
    if (selectedFylke && h.fylke_id !== selectedFylke) return false
    if (selectedKategori && h.kategori_id !== selectedKategori) return false
    return true
  })

  return (
    <DashboardLayout role="presse">
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Hendelser</h1>
          <p className="text-sm text-gray-400">Presseoversikt med utvidet informasjon</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
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
                {f === 'alle' ? 'Alle' : f === 'pågår' ? 'Pågår' : 'Avsluttet'}
              </button>
            ))}
          </div>

          <select
            value={selectedFylke}
            onChange={(e) => setSelectedFylke(e.target.value)}
            className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Alle fylker</option>
            {fylker.map((f) => (
              <option key={f.id} value={f.id}>{f.navn}</option>
            ))}
          </select>

          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Alle kategorier</option>
            {kategorier.map((k) => (
              <option key={k.id} value={k.id}>{k.navn}</option>
            ))}
          </select>
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
            const kat = kategorier.find((k) => k.id === h.kategori_id)
            const isExpanded = expandedId === h.id

            return (
              <div
                key={h.id}
                className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-[#222] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : h.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{bv?.kort_navn}</span>
                      <span className="text-xs text-gray-500">&middot;</span>
                      <span className="text-xs text-gray-400">{kommune?.navn}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={h.status} />
                      <SeverityDot severity={h.alvorlighetsgrad} showLabel />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{h.tittel}</h3>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">{formatDateTime(h.opprettet_tidspunkt)}</span>
                    {kat && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: kat.farge + '22', color: kat.farge }}
                      >
                        {kat.navn}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-300">{h.beskrivelse}</p>

                  {/* Press-only info badge */}
                  <div className="mt-2 flex items-center gap-1">
                    <svg className={`w-3 h-3 ${h.presse_tekst ? 'text-cyan-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <span className={`text-xs ${h.presse_tekst ? 'text-cyan-400' : 'text-gray-500'}`}>
                      {h.presse_tekst ? 'Pressemelding tilgjengelig' : 'Ingen pressemelding'}
                    </span>
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded view with press-only details */}
                {isExpanded && (
                  <div className="border-t border-[#2a2a2a] p-4 space-y-4">
                    {/* Press info section */}
                    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-cyan-400">Pressemelding</h4>
                      </div>
                      {h.presse_tekst ? (
                        <p className="text-sm text-gray-300 whitespace-pre-line">{h.presse_tekst}</p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Ingen pressemelding lagt til ennå. Kontakt vaktleder {bv?.kort_navn} for informasjon.
                        </p>
                      )}
                    </div>

                    {/* Full details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Sted</p>
                        <p className="text-sm text-white">{h.sted}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Brannvesen</p>
                        <p className="text-sm text-white">{bv?.navn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Kommune / Fylke</p>
                        <p className="text-sm text-white">{kommune?.navn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Opprettet</p>
                        <p className="text-sm text-white">{formatDateTime(h.opprettet_tidspunkt)}</p>
                      </div>
                      {h.latitude && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Koordinater</p>
                          <p className="text-sm text-white">{h.latitude}, {h.longitude}</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline / Updates */}
                    {h.oppdateringer && h.oppdateringer.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                          Tidslinje ({h.oppdateringer.length} oppdateringer)
                        </h4>
                        <div className="space-y-2 border-l-2 border-blue-500/30 pl-3">
                          {h.oppdateringer.map((upd) => (
                            <div key={upd.id}>
                              <span className="text-xs text-gray-500">{formatTime(upd.opprettet_tidspunkt)}</span>
                              <p className="text-sm text-gray-300">{upd.tekst}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
    </DashboardLayout>
  )
}

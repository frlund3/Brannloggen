'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useBrukerprofiler } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { formatDateTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState, useMemo, useEffect, useCallback } from 'react'

interface AktivitetsloggEntry {
  id: string
  tidspunkt: string
  bruker_id: string | null
  handling: string
  tabell: string
  rad_id: string | null
  hendelse_id: string | null
  hendelse_tittel: string | null
  detaljer: Record<string, unknown> | null
}

type HandlingFilter = 'alle' | 'opprettet' | 'redigert' | 'deaktivert' | 'avsluttet' | 'bilde' | 'oppdatering' | 'presse' | 'notat'

export default function AdminLoggPage() {
  const { data: brukerprofiler, loading: brukereLoading } = useBrukerprofiler()
  const { is110Admin } = useSentralScope()

  const [entries, setEntries] = useState<AktivitetsloggEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [handlingFilter, setHandlingFilter] = useState<HandlingFilter>('alle')
  const [brukerFilter, setBrukerFilter] = useState('')

  const fetchEntries = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('aktivitetslogg')
        .select('*')
        .order('tidspunkt', { ascending: false })
        .limit(500)
      if (error) throw error
      setEntries(data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 30000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  const getUserName = (userId: string | null) => {
    if (!userId) return null
    const profil = brukerprofiler.find(b => b.user_id === userId)
    return profil?.fullt_navn || null
  }

  const handlingLabel = (h: string) => {
    switch (h) {
      case 'opprettet': return 'Opprettet'
      case 'redigert': return 'Redigert'
      case 'deaktivert': return 'Deaktivert'
      case 'avsluttet': return 'Avsluttet'
      case 'gjenåpnet': return 'Gjenåpnet'
      case 'bilde_lastet_opp': return 'Bilde lastet opp'
      case 'bilde_fjernet': return 'Bilde fjernet'
      case 'ny_oppdatering': return 'Ny oppdatering'
      case 'redigert_oppdatering': return 'Redigert oppdatering'
      case 'deaktivert_oppdatering': return 'Deaktivert oppdatering'
      case 'ny_pressemelding': return 'Ny pressemelding'
      case 'redigert_pressemelding': return 'Redigert pressemelding'
      case 'deaktivert_pressemelding': return 'Deaktivert pressemelding'
      case 'ny_notat': return 'Nytt notat'
      case 'redigert_notat': return 'Redigert notat'
      case 'deaktivert_notat': return 'Deaktivert notat'
      default: return h
    }
  }

  const handlingColor = (h: string) => {
    if (h === 'opprettet') return 'bg-red-500/20 text-red-400'
    if (h === 'redigert' || h.startsWith('redigert_')) return 'bg-blue-500/20 text-blue-400'
    if (h === 'deaktivert' || h.startsWith('deaktivert_')) return 'bg-orange-500/20 text-orange-400'
    if (h === 'avsluttet') return 'bg-green-500/20 text-green-400'
    if (h === 'gjenåpnet') return 'bg-purple-500/20 text-purple-400'
    if (h.startsWith('bilde')) return 'bg-pink-500/20 text-pink-400'
    if (h.includes('oppdatering')) return 'bg-blue-500/20 text-blue-400'
    if (h.includes('presse')) return 'bg-cyan-500/20 text-cyan-400'
    if (h.includes('notat')) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-gray-500/20 text-gray-400'
  }

  const matchesFilter = (h: string, filter: HandlingFilter) => {
    if (filter === 'alle') return true
    if (filter === 'opprettet') return h === 'opprettet'
    if (filter === 'redigert') return h === 'redigert' || h.startsWith('redigert_')
    if (filter === 'deaktivert') return h === 'deaktivert' || h.startsWith('deaktivert_')
    if (filter === 'avsluttet') return h === 'avsluttet' || h === 'gjenåpnet'
    if (filter === 'bilde') return h.startsWith('bilde')
    if (filter === 'oppdatering') return h.includes('oppdatering')
    if (filter === 'presse') return h.includes('presse')
    if (filter === 'notat') return h.includes('notat')
    return true
  }

  const filtered = useMemo(() => {
    let result = entries

    if (handlingFilter !== 'alle') {
      result = result.filter(e => matchesFilter(e.handling, handlingFilter))
    }

    if (brukerFilter) {
      result = result.filter(e => e.bruker_id === brukerFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        (e.hendelse_tittel || '').toLowerCase().includes(q) ||
        handlingLabel(e.handling).toLowerCase().includes(q) ||
        (getUserName(e.bruker_id) || '').toLowerCase().includes(q) ||
        e.tabell.toLowerCase().includes(q)
      )
    }

    return result
  }, [entries, handlingFilter, brukerFilter, search, brukerprofiler])

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      if (e.bruker_id && !map.has(e.bruker_id)) {
        const name = getUserName(e.bruker_id)
        if (name) map.set(e.bruker_id, name)
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [entries, brukerprofiler])

  // Stat counts
  const statCounts = useMemo(() => ({
    opprettet: entries.filter(e => e.handling === 'opprettet').length,
    redigert: entries.filter(e => e.handling === 'redigert' || e.handling.startsWith('redigert_')).length,
    deaktivert: entries.filter(e => e.handling === 'deaktivert' || e.handling.startsWith('deaktivert_')).length,
    presse: entries.filter(e => e.handling.includes('presse')).length,
    bilde: entries.filter(e => e.handling.startsWith('bilde')).length,
  }), [entries])

  if (loading || brukereLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Aktivitetslogg</h1>
          <p className="text-sm text-gray-400">All aktivitet fra hendelser, oppdateringer, pressemeldinger, bilder og interne notater</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søk i logg..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={handlingFilter}
            onChange={e => setHandlingFilter(e.target.value as HandlingFilter)}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="alle">Alle handlinger</option>
            <option value="opprettet">Opprettet</option>
            <option value="redigert">Redigert</option>
            <option value="deaktivert">Deaktivert</option>
            <option value="avsluttet">Avsluttet/Gjenåpnet</option>
            <option value="bilde">Bilder</option>
            <option value="oppdatering">Oppdateringer</option>
            <option value="presse">Presse</option>
            <option value="notat">Notater</option>
          </select>

          <select
            value={brukerFilter}
            onChange={e => setBrukerFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Alle brukere</option>
            {uniqueUsers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <button
            onClick={fetchEntries}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            title="Oppdater"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { key: 'opprettet', label: 'Opprettet', count: statCounts.opprettet },
            { key: 'redigert', label: 'Redigert', count: statCounts.redigert },
            { key: 'deaktivert', label: 'Deaktivert', count: statCounts.deaktivert },
            { key: 'presse', label: 'Presse', count: statCounts.presse },
            { key: 'bilde', label: 'Bilder', count: statCounts.bilde },
          ].map(s => (
            <div key={s.key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <span className="text-lg font-bold text-white">{s.count}</span>
              <span className="block text-xs text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {entries.length === 0 && !loading && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center mb-6">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-400 mb-1">Ingen loggoppføringer ennå</p>
            <p className="text-xs text-gray-600">Aktiviteter logges automatisk når hendelser opprettes, redigeres eller oppdateres.</p>
          </div>
        )}

        {/* Log entries */}
        {entries.length > 0 && (
          <>
            <div className="space-y-2">
              {filtered.slice(0, 200).map(entry => (
                <div key={entry.id} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 mt-0.5 ${handlingColor(entry.handling)}`}>
                      {handlingLabel(entry.handling)}
                    </span>
                    <div className="min-w-0 flex-1">
                      {entry.hendelse_tittel ? (
                        <p className="text-sm text-white truncate">{entry.hendelse_tittel}</p>
                      ) : (
                        <p className="text-xs text-gray-600">{entry.tabell}</p>
                      )}
                      {entry.detaljer && Object.keys(entry.detaljer).length > 0 && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {entry.detaljer.tekst ? String(entry.detaljer.tekst) :
                           entry.detaljer.endrede_felt ? `Felt: ${(entry.detaljer.endrede_felt as string[]).join(', ')}` :
                           JSON.stringify(entry.detaljer)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{formatDateTime(entry.tidspunkt)}</span>
                        <span className="text-xs text-gray-600">&middot;</span>
                        <span className="text-xs text-gray-400">{getUserName(entry.bruker_id) || entry.bruker_id?.slice(0, 8) || 'Ukjent'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && entries.length > 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">Ingen loggoppføringer matcher filteret</div>
            )}
            {filtered.length > 200 && (
              <div className="p-3 text-center text-gray-500 text-xs">
                Viser 200 av {filtered.length} oppføringer. Bruk filtre for å begrense.
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

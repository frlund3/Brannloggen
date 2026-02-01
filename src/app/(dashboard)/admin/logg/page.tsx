'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useHendelser, useBrukerprofiler, useBrannvesen, useKategorier } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { useSentralScope } from '@/hooks/useSentralScope'
import { formatDateTime } from '@/lib/utils'
import { useState, useMemo } from 'react'

interface LogEntry {
  id: string
  tidspunkt: string
  type: 'hendelse' | 'publikum' | 'presse' | 'intern' | 'status'
  hendelse_id: string
  hendelse_tittel: string
  tekst: string
  bruker_id: string | null
  bruker_navn: string | null
}

type TypeFilter = 'alle' | 'hendelse' | 'publikum' | 'presse' | 'intern'

export default function AdminLoggPage() {
  const { data: hendelser, loading: hendelserLoading, refetch } = useHendelser()
  useRealtimeHendelser(refetch)
  const { data: brukerprofiler, loading: brukereLoading } = useBrukerprofiler()
  const { data: brannvesen } = useBrannvesen()
  const { data: kategorier } = useKategorier()
  const { is110Admin } = useSentralScope()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('alle')
  const [brukerFilter, setBrukerFilter] = useState('')

  const loading = hendelserLoading || brukereLoading

  const getUserName = (userId: string | null) => {
    if (!userId) return null
    const profil = brukerprofiler.find(b => b.user_id === userId)
    return profil?.fullt_navn || null
  }

  // Build a unified log from all hendelser + their oppdateringer
  const logEntries = useMemo(() => {
    const entries: LogEntry[] = []

    for (const h of hendelser) {
      if (h.status === 'deaktivert') continue

      // Hendelse creation
      entries.push({
        id: `h-${h.id}`,
        tidspunkt: h.opprettet_tidspunkt,
        type: 'hendelse',
        hendelse_id: h.id,
        hendelse_tittel: h.tittel,
        tekst: `Ny hendelse opprettet: ${h.tittel}`,
        bruker_id: h.opprettet_av || null,
        bruker_navn: getUserName(h.opprettet_av),
      })

      // Status change (avsluttet)
      if (h.avsluttet_tidspunkt) {
        entries.push({
          id: `s-${h.id}`,
          tidspunkt: h.avsluttet_tidspunkt,
          type: 'status',
          hendelse_id: h.id,
          hendelse_tittel: h.tittel,
          tekst: `Hendelse avsluttet: ${h.tittel}`,
          bruker_id: h.opprettet_av || null,
          bruker_navn: getUserName(h.opprettet_av),
        })
      }

      // Public updates
      for (const o of h.oppdateringer || []) {
        entries.push({
          id: `o-${o.id}`,
          tidspunkt: o.opprettet_tidspunkt,
          type: 'publikum',
          hendelse_id: h.id,
          hendelse_tittel: h.tittel,
          tekst: o.tekst,
          bruker_id: o.opprettet_av || null,
          bruker_navn: getUserName(o.opprettet_av),
        })
      }

      // Press updates
      for (const p of h.presseoppdateringer || []) {
        entries.push({
          id: `p-${p.id}`,
          tidspunkt: p.opprettet_tidspunkt,
          type: 'presse',
          hendelse_id: h.id,
          hendelse_tittel: h.tittel,
          tekst: p.tekst,
          bruker_id: p.opprettet_av || null,
          bruker_navn: getUserName(p.opprettet_av),
        })
      }

      // Internal notes
      for (const n of h.interne_notater || []) {
        entries.push({
          id: `n-${n.id}`,
          tidspunkt: n.opprettet_tidspunkt,
          type: 'intern',
          hendelse_id: h.id,
          hendelse_tittel: h.tittel,
          tekst: n.notat,
          bruker_id: n.opprettet_av || null,
          bruker_navn: getUserName(n.opprettet_av),
        })
      }
    }

    // Sort newest first
    entries.sort((a, b) => new Date(b.tidspunkt).getTime() - new Date(a.tidspunkt).getTime())
    return entries
  }, [hendelser, brukerprofiler])

  // Filter
  const filtered = useMemo(() => {
    let result = logEntries

    if (typeFilter !== 'alle') {
      result = result.filter(e => e.type === typeFilter)
    }

    if (brukerFilter) {
      result = result.filter(e => e.bruker_id === brukerFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.tekst.toLowerCase().includes(q) ||
        e.hendelse_tittel.toLowerCase().includes(q) ||
        (e.bruker_navn || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [logEntries, typeFilter, brukerFilter, search])

  // Get unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of logEntries) {
      if (e.bruker_navn && e.bruker_id && !map.has(e.bruker_id)) {
        map.set(e.bruker_id, e.bruker_navn)
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [logEntries])

  const typeLabel = (t: string) => {
    switch (t) {
      case 'hendelse': return 'Hendelse'
      case 'publikum': return 'Publikum'
      case 'presse': return 'Presse'
      case 'intern': return 'Internt'
      case 'status': return 'Status'
      default: return t
    }
  }

  const typeColor = (t: string) => {
    switch (t) {
      case 'hendelse': return 'bg-red-500/20 text-red-400'
      case 'publikum': return 'bg-blue-500/20 text-blue-400'
      case 'presse': return 'bg-amber-500/20 text-amber-400'
      case 'intern': return 'bg-yellow-500/20 text-yellow-400'
      case 'status': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
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
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Aktivitetslogg</h1>
          <p className="text-sm text-gray-400">All aktivitet fra hendelser, oppdateringer, pressemeldinger og interne notater</p>
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
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as TypeFilter)}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="alle">Alle typer</option>
            <option value="hendelse">Hendelser</option>
            <option value="publikum">Publikum</option>
            <option value="presse">Presse</option>
            <option value="intern">Interne notater</option>
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {(['hendelse', 'publikum', 'presse', 'intern', 'status'] as const).map(t => (
            <div key={t} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-center">
              <span className="text-lg font-bold text-white">{logEntries.filter(e => e.type === t).length}</span>
              <span className="block text-xs text-gray-500">{typeLabel(t)}</span>
            </div>
          ))}
        </div>

        {/* Log entries */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium w-[140px]">Tidspunkt</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium w-[90px]">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Hendelse</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Innhold</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell w-[150px]">Bruker</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(entry => (
                  <tr key={entry.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(entry.tidspunkt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${typeColor(entry.type)}`}>
                        {typeLabel(entry.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin/ny-visning`} className="text-sm text-blue-400 hover:text-blue-300 truncate block max-w-[200px]">
                        {entry.hendelse_tittel}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white truncate max-w-[400px]">{entry.tekst}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-400">{entry.bruker_navn || entry.bruker_id?.slice(0, 8) || 'Ukjent'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">Ingen loggoppføringer funnet</div>
          )}
          {filtered.length > 200 && (
            <div className="p-3 text-center text-gray-500 text-xs border-t border-[#2a2a2a]">
              Viser 200 av {filtered.length} oppføringer. Bruk filtre for å begrense.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

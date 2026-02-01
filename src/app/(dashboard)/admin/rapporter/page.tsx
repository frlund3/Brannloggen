'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import {
  useHendelser,
  useBrannvesen,
  useKommuner,
  useKategorier,
  useFylker,
  useSentraler,
  useBrukerprofiler,
} from '@/hooks/useSupabaseData'
import type { Hendelse } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { useSentralScope } from '@/hooks/useSentralScope'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import {
  startOfDay, endOfDay, subDays,
  format, differenceInMinutes,
  startOfWeek, startOfMonth,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
} from 'date-fns'
import { nb } from 'date-fns/locale'

// --- Helpers ---

function beregnVarighet(h: Hendelse): number | null {
  if (!h.avsluttet_tidspunkt) return null
  return differenceInMinutes(new Date(h.avsluttet_tidspunkt), new Date(h.opprettet_tidspunkt))
}

function formaterVarighet(minutter: number): string {
  if (minutter < 60) return `${minutter} min`
  const timer = Math.floor(minutter / 60)
  const rest = minutter % 60
  if (timer < 24) return `${timer}t ${rest}m`
  const dager = Math.floor(timer / 24)
  return `${dager}d ${timer % 24}t`
}

function KpiCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function ReportCard({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <section className={fullWidth ? 'col-span-1 lg:col-span-2' : ''}>
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-2">
        {children}
      </div>
    </section>
  )
}

function HorizontalBar({ label, count, max, color, suffix }: {
  label: string; count: number; max: number; color: string; suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white truncate w-[35%] shrink-0">{label}</span>
      <div className="flex-1 bg-[#0a0a0a] rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-400 w-16 text-right shrink-0">{count}{suffix || ''}</span>
    </div>
  )
}

// --- Main Page ---

export default function AdminRapporterPage() {
  const { isAdmin, is110Admin, isScoped, filterByBrannvesen, filterBrannvesen, filterFylker, filterKommuner, filterSentraler } = useSentralScope()
  const { data: hendelser, loading: hLoading, refetch } = useHendelser({ excludeDeactivated: false })
  const { data: brannvesen, loading: bLoading } = useBrannvesen()
  const { data: kommuner, loading: kLoading } = useKommuner()
  const { data: kategorier, loading: katLoading } = useKategorier()
  const { data: fylker, loading: fLoading } = useFylker()
  const { data: sentraler, loading: sLoading } = useSentraler()
  const { data: brukerprofiler } = useBrukerprofiler()
  useRealtimeHendelser(refetch)

  // Filter state
  const [datoFra, setDatoFra] = useState('')
  const [datoTil, setDatoTil] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [alvorlighetFilter, setAlvorlighetFilter] = useState<string[]>([])
  const [sentralFilter, setSentralFilter] = useState('')
  const [brannvesenFilter, setBrannvesenFilter] = useState('')
  const [fylkeFilter, setFylkeFilter] = useState('')
  const [kommuneFilter, setKommuneFilter] = useState('')
  const [kategoriFilter, setKategoriFilter] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tidsperiode, setTidsperiode] = useState<'dag' | 'uke' | 'måned'>('dag')
  const [kategoriPanelOpen, setKategoriPanelOpen] = useState(false)

  const loading = hLoading || bLoading || kLoading || katLoading || fLoading || sLoading

  const effectiveRole = is110Admin ? '110-admin' : isAdmin ? 'admin' : 'operator'

  if (loading) {
    return (
      <DashboardLayout role={effectiveRole}>
        <div className="p-8 text-center text-gray-400">Laster rapporter...</div>
      </DashboardLayout>
    )
  }

  // Scope data by user's sentraler
  const scopedHendelser = isScoped ? filterByBrannvesen(hendelser) : hendelser
  const availableSentraler = isScoped ? filterSentraler(sentraler) : sentraler
  const availableBrannvesen = isScoped ? filterBrannvesen(brannvesen) : brannvesen
  const availableFylker = isScoped ? filterFylker(fylker) : fylker
  const availableKommuner = isScoped ? filterKommuner(kommuner) : kommuner

  // Sentral reverse lookup: brannvesen_id → sentral_id
  const brannvesenToSentral: Record<string, string> = {}
  sentraler.forEach(s => {
    s.brannvesen_ids.forEach(bvId => {
      brannvesenToSentral[bvId] = s.id
    })
  })

  // Filter brannvesen options by selected sentral
  const brannvesenOptions = sentralFilter
    ? availableBrannvesen.filter(b => sentraler.find(s => s.id === sentralFilter)?.brannvesen_ids.includes(b.id))
    : availableBrannvesen

  // Filter kommune options by selected fylke
  const kommuneOptions = fylkeFilter
    ? availableKommuner.filter(k => k.fylke_id === fylkeFilter)
    : availableKommuner

  return <RapportContent />

  // Separate component to use hooks above in useMemo
  function RapportContent() {
    // Apply filters
    const filteredHendelser = useMemo(() => {
      let result = scopedHendelser
      if (datoFra) result = result.filter(h => new Date(h.opprettet_tidspunkt) >= startOfDay(new Date(datoFra)))
      if (datoTil) result = result.filter(h => new Date(h.opprettet_tidspunkt) <= endOfDay(new Date(datoTil)))
      if (statusFilter) result = result.filter(h => h.status === statusFilter)
      if (alvorlighetFilter.length > 0) result = result.filter(h => alvorlighetFilter.includes(h.alvorlighetsgrad))
      if (sentralFilter) {
        const sentral = sentraler.find(s => s.id === sentralFilter)
        if (sentral) result = result.filter(h => sentral.brannvesen_ids.includes(h.brannvesen_id))
      }
      if (brannvesenFilter) result = result.filter(h => h.brannvesen_id === brannvesenFilter)
      if (fylkeFilter) result = result.filter(h => h.fylke_id === fylkeFilter)
      if (kommuneFilter) result = result.filter(h => h.kommune_id === kommuneFilter)
      if (kategoriFilter.length > 0) result = result.filter(h => kategoriFilter.includes(h.kategori_id))
      return result
    }, [scopedHendelser, datoFra, datoTil, statusFilter, alvorlighetFilter, sentralFilter, brannvesenFilter, fylkeFilter, kommuneFilter, kategoriFilter, sentraler])

    // KPIs
    const kpis = useMemo(() => {
      const total = filteredHendelser.length
      const pågående = filteredHendelser.filter(h => h.status === 'pågår').length
      const avsluttet = filteredHendelser.filter(h => h.status === 'avsluttet').length
      const kritisk = filteredHendelser.filter(h => h.alvorlighetsgrad === 'kritisk').length
      const varigheter = filteredHendelser.map(beregnVarighet).filter((v): v is number => v !== null)
      const gjennomsnittMin = varigheter.length > 0
        ? Math.round(varigheter.reduce((a, b) => a + b, 0) / varigheter.length)
        : 0
      const totalOppdateringer = filteredHendelser.reduce((sum, h) => sum + (h.oppdateringer?.length || 0), 0)
      return { total, pågående, avsluttet, kritisk, gjennomsnittMin, totalOppdateringer }
    }, [filteredHendelser])

    // Per kategori
    const perKategori = useMemo(() => {
      const counts: Record<string, number> = {}
      filteredHendelser.forEach(h => { counts[h.kategori_id] = (counts[h.kategori_id] || 0) + 1 })
      return kategorier
        .map(k => ({ ...k, count: counts[k.id] || 0 }))
        .filter(k => k.count > 0)
        .sort((a, b) => b.count - a.count)
    }, [filteredHendelser, kategorier])

    // Per sentral
    const perSentral = useMemo(() => {
      const counts: Record<string, number> = {}
      filteredHendelser.forEach(h => {
        const sId = brannvesenToSentral[h.brannvesen_id]
        if (sId) counts[sId] = (counts[sId] || 0) + 1
      })
      return availableSentraler
        .map(s => ({ ...s, count: counts[s.id] || 0 }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count)
    }, [filteredHendelser, availableSentraler, brannvesenToSentral])

    // Per brannvesen (top 20)
    const perBrannvesen = useMemo(() => {
      const counts: Record<string, number> = {}
      filteredHendelser.forEach(h => { counts[h.brannvesen_id] = (counts[h.brannvesen_id] || 0) + 1 })
      return availableBrannvesen
        .map(b => ({ ...b, count: counts[b.id] || 0 }))
        .filter(b => b.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    }, [filteredHendelser, availableBrannvesen])

    // Per fylke
    const perFylke = useMemo(() => {
      const counts: Record<string, number> = {}
      filteredHendelser.forEach(h => { counts[h.fylke_id] = (counts[h.fylke_id] || 0) + 1 })
      return availableFylker
        .map(f => ({ ...f, count: counts[f.id] || 0 }))
        .filter(f => f.count > 0)
        .sort((a, b) => b.count - a.count)
    }, [filteredHendelser, availableFylker])

    // Per alvorlighetsgrad
    const perAlvorlighet = useMemo(() => {
      const order = ['kritisk', 'høy', 'middels', 'lav']
      const colors: Record<string, string> = { kritisk: '#dc2626', høy: '#f97316', middels: '#eab308', lav: '#22c55e' }
      const labels: Record<string, string> = { kritisk: 'Kritisk', høy: 'Høy', middels: 'Middels', lav: 'Lav' }
      const counts: Record<string, number> = {}
      filteredHendelser.forEach(h => { counts[h.alvorlighetsgrad] = (counts[h.alvorlighetsgrad] || 0) + 1 })
      return order.map(key => ({ key, label: labels[key], color: colors[key], count: counts[key] || 0 }))
    }, [filteredHendelser])

    // Status-fordeling
    const statusFordeling = useMemo(() => {
      const total = filteredHendelser.length
      const pågår = filteredHendelser.filter(h => h.status === 'pågår').length
      const avsluttet = filteredHendelser.filter(h => h.status === 'avsluttet').length
      const deaktivert = filteredHendelser.filter(h => h.status === 'deaktivert').length
      return [
        { label: 'Pågår', count: pågår, color: '#3b82f6', pct: total > 0 ? (pågår / total) * 100 : 0 },
        { label: 'Avsluttet', count: avsluttet, color: '#6b7280', pct: total > 0 ? (avsluttet / total) * 100 : 0 },
        { label: 'Deaktivert', count: deaktivert, color: '#374151', pct: total > 0 ? (deaktivert / total) * 100 : 0 },
      ]
    }, [filteredHendelser])

    // Varighet per kategori
    const varighetPerKategori = useMemo(() => {
      const sums: Record<string, { total: number; count: number }> = {}
      filteredHendelser.forEach(h => {
        const dur = beregnVarighet(h)
        if (dur !== null) {
          if (!sums[h.kategori_id]) sums[h.kategori_id] = { total: 0, count: 0 }
          sums[h.kategori_id].total += dur
          sums[h.kategori_id].count += 1
        }
      })
      return kategorier
        .map(k => ({
          ...k,
          avgMin: sums[k.id] ? Math.round(sums[k.id].total / sums[k.id].count) : 0,
          sampleCount: sums[k.id]?.count || 0,
        }))
        .filter(k => k.sampleCount > 0)
        .sort((a, b) => b.avgMin - a.avgMin)
    }, [filteredHendelser, kategorier])

    // Over tid
    const overTid = useMemo(() => {
      if (filteredHendelser.length === 0) return []
      const sorted = [...filteredHendelser].sort(
        (a, b) => new Date(a.opprettet_tidspunkt).getTime() - new Date(b.opprettet_tidspunkt).getTime()
      )
      const firstDate = new Date(sorted[0].opprettet_tidspunkt)
      const lastDate = new Date(sorted[sorted.length - 1].opprettet_tidspunkt)

      let intervals: Date[]
      let formatStr: string
      let keyFn: (d: Date) => string

      if (tidsperiode === 'dag') {
        intervals = eachDayOfInterval({ start: firstDate, end: lastDate })
        formatStr = 'dd.MM'
        keyFn = (d) => format(startOfDay(d), 'yyyy-MM-dd')
      } else if (tidsperiode === 'uke') {
        intervals = eachWeekOfInterval({ start: firstDate, end: lastDate }, { locale: nb })
        formatStr = "'U'w"
        keyFn = (d) => format(startOfWeek(d, { locale: nb }), 'yyyy-MM-dd')
      } else {
        intervals = eachMonthOfInterval({ start: firstDate, end: lastDate })
        formatStr = 'MMM yy'
        keyFn = (d) => format(startOfMonth(d), 'yyyy-MM')
      }

      const counts: Record<string, number> = {}
      intervals.forEach(d => { counts[keyFn(d)] = 0 })
      filteredHendelser.forEach(h => {
        const key = keyFn(new Date(h.opprettet_tidspunkt))
        counts[key] = (counts[key] || 0) + 1
      })

      return intervals.map(d => ({
        label: format(d, formatStr, { locale: nb }),
        key: keyFn(d),
        count: counts[keyFn(d)] || 0,
      }))
    }, [filteredHendelser, tidsperiode])

    // Pågående hendelser (uavhengig av datofilter)
    const pågåendeHendelser = useMemo(() => {
      return scopedHendelser
        .filter(h => h.status === 'pågår')
        .sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())
    }, [scopedHendelser])

    // Per bruker
    const perBruker = useMemo(() => {
      const counts: Record<string, number> = {}
      filteredHendelser.forEach(h => {
        if (h.opprettet_av) counts[h.opprettet_av] = (counts[h.opprettet_av] || 0) + 1
      })
      return Object.entries(counts)
        .map(([userId, count]) => {
          const profil = brukerprofiler.find(p => p.user_id === userId)
          return { userId, navn: profil?.fullt_navn || userId.slice(0, 8) + '...', count }
        })
        .sort((a, b) => b.count - a.count)
    }, [filteredHendelser, brukerprofiler])

    const activeFilterCount = [
      datoFra, datoTil, statusFilter, brannvesenFilter, sentralFilter, fylkeFilter, kommuneFilter,
    ].filter(Boolean).length + alvorlighetFilter.length + kategoriFilter.length

    const resetFilters = () => {
      setDatoFra(''); setDatoTil(''); setStatusFilter(''); setAlvorlighetFilter([])
      setSentralFilter(''); setBrannvesenFilter(''); setFylkeFilter(''); setKommuneFilter('')
      setKategoriFilter([])
    }

    const selectStyle = 'px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500'

    return (
      <DashboardLayout role={effectiveRole}>
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Hendelsesrapporter</h1>
            <p className="text-sm text-gray-400">
              {isScoped ? 'Statistikk for dine 110-sentraler' : 'Statistikk og rapporter for alle hendelser'}
            </p>
          </div>

          {/* Quick date presets */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { label: 'I dag', fn: () => { setDatoFra(format(new Date(), 'yyyy-MM-dd')); setDatoTil(format(new Date(), 'yyyy-MM-dd')) } },
              { label: 'Siste 7 dager', fn: () => { setDatoFra(format(subDays(new Date(), 7), 'yyyy-MM-dd')); setDatoTil('') } },
              { label: 'Siste 30 dager', fn: () => { setDatoFra(format(subDays(new Date(), 30), 'yyyy-MM-dd')); setDatoTil('') } },
              { label: 'Siste 90 dager', fn: () => { setDatoFra(format(subDays(new Date(), 90), 'yyyy-MM-dd')); setDatoTil('') } },
              { label: 'Alle', fn: () => { setDatoFra(''); setDatoTil('') } },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={preset.fn}
                className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-400 hover:text-white hover:border-blue-500 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtre
              {activeFilterCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-300">
                Nullstill filtre
              </button>
            )}
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Dato fra/til */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fra dato</label>
                  <input type="date" value={datoFra} onChange={e => setDatoFra(e.target.value)} className={selectStyle + ' w-full'} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Til dato</label>
                  <input type="date" value={datoTil} onChange={e => setDatoTil(e.target.value)} className={selectStyle + ' w-full'} />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectStyle + ' w-full'}>
                    <option value="">Alle</option>
                    <option value="pågår">Pågår</option>
                    <option value="avsluttet">Avsluttet</option>
                    <option value="deaktivert">Deaktivert</option>
                  </select>
                </div>

                {/* 110-sentral */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">110-sentral</label>
                  <select value={sentralFilter} onChange={e => { setSentralFilter(e.target.value); setBrannvesenFilter('') }} className={selectStyle + ' w-full'}>
                    <option value="">Alle sentraler</option>
                    {availableSentraler.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
                  </select>
                </div>

                {/* Brannvesen */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Brannvesen</label>
                  <select value={brannvesenFilter} onChange={e => setBrannvesenFilter(e.target.value)} className={selectStyle + ' w-full'}>
                    <option value="">Alle brannvesen</option>
                    {brannvesenOptions.map(b => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
                  </select>
                </div>

                {/* Fylke */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fylke</label>
                  <select value={fylkeFilter} onChange={e => { setFylkeFilter(e.target.value); setKommuneFilter('') }} className={selectStyle + ' w-full'}>
                    <option value="">Alle fylker</option>
                    {availableFylker.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
                  </select>
                </div>

                {/* Kommune */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Kommune</label>
                  <select value={kommuneFilter} onChange={e => setKommuneFilter(e.target.value)} className={selectStyle + ' w-full'}>
                    <option value="">Alle kommuner</option>
                    {kommuneOptions.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
                  </select>
                </div>

                {/* Alvorlighetsgrad */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Alvorlighetsgrad</label>
                  <div className="flex flex-wrap gap-2">
                    {(['lav', 'middels', 'høy', 'kritisk'] as const).map(a => (
                      <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alvorlighetFilter.includes(a)}
                          onChange={() => setAlvorlighetFilter(prev =>
                            prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
                          )}
                          className="rounded border-gray-600"
                        />
                        <span className="text-xs text-gray-300 capitalize">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kategori multi-select */}
              <div className="mt-4">
                <button
                  onClick={() => setKategoriPanelOpen(!kategoriPanelOpen)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
                >
                  Kategorier {kategoriFilter.length > 0 && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{kategoriFilter.length}</span>}
                  <svg className={cn('w-3 h-3 transition-transform', kategoriPanelOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {kategoriPanelOpen && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {kategorier.map(k => (
                      <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kategoriFilter.includes(k.id)}
                          onChange={() => setKategoriFilter(prev =>
                            prev.includes(k.id) ? prev.filter(x => x !== k.id) : [...prev, k.id]
                          )}
                          className="rounded border-gray-600"
                        />
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: k.farge }} />
                        <span className="text-xs text-gray-300 truncate">{k.navn}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <KpiCard label="Totalt hendelser" value={kpis.total} />
            <KpiCard label="Pågår nå" value={kpis.pågående} color="text-red-400" />
            <KpiCard label="Avsluttet" value={kpis.avsluttet} color="text-gray-400" />
            <KpiCard label="Kritiske" value={kpis.kritisk} color="text-red-400" />
            <KpiCard label="Snittvarighet" value={kpis.gjennomsnittMin > 0 ? formaterVarighet(kpis.gjennomsnittMin) : '-'} color="text-yellow-400" />
            <KpiCard label="Oppdateringer" value={kpis.totalOppdateringer} color="text-blue-400" />
          </div>

          {/* Report sections - two column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 1. Per kategori */}
            <ReportCard title="Hendelser per kategori">
              {perKategori.length === 0 && <p className="text-sm text-gray-500">Ingen data</p>}
              {perKategori.map(k => (
                <HorizontalBar key={k.id} label={k.navn} count={k.count} max={perKategori[0]?.count || 1} color={k.farge} />
              ))}
            </ReportCard>

            {/* 2. Per sentral */}
            <ReportCard title="Hendelser per 110-sentral">
              {perSentral.length === 0 && <p className="text-sm text-gray-500">Ingen data</p>}
              {perSentral.map(s => (
                <HorizontalBar key={s.id} label={s.kort_navn} count={s.count} max={perSentral[0]?.count || 1} color="#f97316" />
              ))}
            </ReportCard>

            {/* 3. Per brannvesen */}
            <ReportCard title="Hendelser per brannvesen (topp 20)">
              {perBrannvesen.length === 0 && <p className="text-sm text-gray-500">Ingen data</p>}
              {perBrannvesen.map(b => (
                <HorizontalBar key={b.id} label={b.kort_navn} count={b.count} max={perBrannvesen[0]?.count || 1} color="#3b82f6" />
              ))}
            </ReportCard>

            {/* 4. Per fylke */}
            <ReportCard title="Hendelser per fylke">
              {perFylke.length === 0 && <p className="text-sm text-gray-500">Ingen data</p>}
              {perFylke.map(f => (
                <HorizontalBar key={f.id} label={f.navn} count={f.count} max={perFylke[0]?.count || 1} color="#8b5cf6" />
              ))}
            </ReportCard>

            {/* 5. Per alvorlighetsgrad */}
            <ReportCard title="Hendelser per alvorlighetsgrad">
              {perAlvorlighet.map(a => (
                <HorizontalBar key={a.key} label={a.label} count={a.count} max={Math.max(...perAlvorlighet.map(x => x.count), 1)} color={a.color} />
              ))}
            </ReportCard>

            {/* 6. Statusfordeling */}
            <ReportCard title="Statusfordeling">
              {filteredHendelser.length === 0 ? (
                <p className="text-sm text-gray-500">Ingen data</p>
              ) : (
                <>
                  <div className="flex h-6 rounded-full overflow-hidden">
                    {statusFordeling.filter(s => s.count > 0).map(s => (
                      <div
                        key={s.label}
                        style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                        className="transition-all"
                        title={`${s.label}: ${s.count}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2">
                    {statusFordeling.map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-400">{s.label}: {s.count} ({s.pct.toFixed(1)}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ReportCard>

            {/* 7. Varighet per kategori */}
            <ReportCard title="Gjennomsnittlig varighet per kategori">
              {varighetPerKategori.length === 0 && <p className="text-sm text-gray-500">Ingen avsluttede hendelser</p>}
              {varighetPerKategori.map(k => (
                <HorizontalBar
                  key={k.id}
                  label={k.navn}
                  count={k.avgMin}
                  max={varighetPerKategori[0]?.avgMin || 1}
                  color={k.farge}
                  suffix={` (${formaterVarighet(k.avgMin)})`}
                />
              ))}
            </ReportCard>

            {/* 8. Per bruker */}
            <ReportCard title="Aktivitet per operatør">
              {perBruker.length === 0 && <p className="text-sm text-gray-500">Ingen data</p>}
              {perBruker.slice(0, 15).map(b => (
                <HorizontalBar key={b.userId} label={b.navn} count={b.count} max={perBruker[0]?.count || 1} color="#06b6d4" />
              ))}
            </ReportCard>
          </div>

          {/* 9. Hendelser over tid (full width) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Hendelser over tid</h2>
              <div className="flex gap-1">
                {(['dag', 'uke', 'måned'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setTidsperiode(p)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-lg transition-colors',
                      tidsperiode === p ? 'bg-blue-500 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              {overTid.length === 0 ? (
                <p className="text-sm text-gray-500">Ingen data</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 h-48" style={{ minWidth: `${overTid.length * 28}px` }}>
                    {(() => {
                      const maxCount = Math.max(...overTid.map(b => b.count), 1)
                      return overTid.map(bucket => {
                        const height = (bucket.count / maxCount) * 100
                        return (
                          <div key={bucket.key} className="flex flex-col items-center flex-1" style={{ minWidth: '24px' }}>
                            <span className="text-xs text-gray-500 mb-1">{bucket.count > 0 ? bucket.count : ''}</span>
                            <div
                              className="w-4 bg-blue-500 rounded-t transition-all"
                              style={{ height: `${height}%`, minHeight: bucket.count > 0 ? '4px' : '0' }}
                            />
                          </div>
                        )
                      })
                    })()}
                  </div>
                  <div className="flex gap-1 mt-2" style={{ minWidth: `${overTid.length * 28}px` }}>
                    {overTid.map((bucket, i) => (
                      <div key={bucket.key} className="flex-1 text-center" style={{ minWidth: '24px' }}>
                        {/* Show labels at intervals to avoid crowding */}
                        {(i % Math.max(1, Math.floor(overTid.length / 12)) === 0 || i === overTid.length - 1) && (
                          <span className="text-xs text-gray-600">{bucket.label}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 10. Pågående hendelser (full width) */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">
              Pågående hendelser <span className="text-sm font-normal text-red-400">({pågåendeHendelser.length})</span>
            </h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
              {pågåendeHendelser.length === 0 ? (
                <p className="text-sm text-gray-500 p-4">Ingen pågående hendelser</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Hendelse</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden sm:table-cell">Kategori</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Alvorlighet</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Brannvesen</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Sted</th>
                        <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Varighet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pågåendeHendelser.map(h => {
                        const kat = kategorier.find(k => k.id === h.kategori_id)
                        const bv = brannvesen.find(b => b.id === h.brannvesen_id)
                        const duration = differenceInMinutes(new Date(), new Date(h.opprettet_tidspunkt))
                        return (
                          <tr key={h.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                            <td className="px-3 sm:px-4 py-3">
                              <span className="text-sm text-white">{h.tittel}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                              {kat && (
                                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: kat.farge + '20', color: kat.farge }}>
                                  {kat.navn}
                                </span>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <SeverityDot severity={h.alvorlighetsgrad} showLabel />
                            </td>
                            <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                              <span className="text-sm text-gray-400">{bv?.kort_navn || '-'}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                              <span className="text-sm text-gray-400 truncate max-w-[200px] block">{h.sted}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className="text-sm text-yellow-400 font-medium">{formaterVarighet(duration)}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer info */}
          <div className="text-xs text-gray-600 text-center">
            Viser {filteredHendelser.length} av {scopedHendelser.length} hendelser
            {isScoped && ' (begrenset til dine sentraler)'}
          </div>
        </div>
      </DashboardLayout>
    )
  }
}

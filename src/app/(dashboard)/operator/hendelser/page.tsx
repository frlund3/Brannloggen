'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { useHendelser, useBrannvesen, useKategorier, useFylker, useKommuner, useSentraler } from '@/hooks/useSupabaseData'
import { invalidateCache } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { formatDateTime, formatTimeAgo } from '@/lib/utils'
import { useSentralScope } from '@/hooks/useSentralScope'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function OperatorHendelserPage() {
  const { data: allHendelser, loading: hendelserLoading, refetch } = useHendelser({ excludeDeactivated: true })
  useRealtimeHendelser(refetch)
  const { data: brannvesen, loading: brannvesenLoading } = useBrannvesen()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kommuner, loading: kommunerLoading } = useKommuner()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
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
  const [editTittel, setEditTittel] = useState('')
  const [editBeskrivelse, setEditBeskrivelse] = useState('')
  const [editSted, setEditSted] = useState('')
  const [editKategoriId, setEditKategoriId] = useState('')
  const [editAlvor, setEditAlvor] = useState('')
  const [editBrannvesenId, setEditBrannvesenId] = useState('')
  const [editSentralId, setEditSentralId] = useState('')
  const [editPressetekst, setEditPressetekst] = useState('')
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null)
  const [editUpdateText, setEditUpdateText] = useState('')
  const [newUpdate, setNewUpdate] = useState('')
  const [saving, setSaving] = useState(false)

  // Scope hendelser for 110-admin (must be before any early returns to follow Rules of Hooks)
  const scopedHendelser = useMemo(() => {
    return isScoped ? filterByBrannvesen(allHendelser) : allHendelser
  }, [isScoped, filterByBrannvesen, allHendelser])

  const isLoading = hendelserLoading || brannvesenLoading || kategorierLoading || fylkerLoading || kommunerLoading || sentralerLoading
  if (isLoading) return <div className="p-8 text-center text-gray-400">Laster...</div>

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

  const handleDeactivate = async (id: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelser') as any).update({ status: 'deaktivert' }).eq('id', id)
      if (error) throw error
      setDeactivatedIds([...deactivatedIds, id])
      setDeactivateConfirm(null)
      invalidateCache()
      toast.success('Hendelse deaktivert')
    } catch (err) {
      toast.error('Kunne ikke deaktivere hendelse: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
      setDeactivateConfirm(null)
    }
  }

  const openHendelse = (id: string) => {
    const h = allHendelser.find(x => x.id === id)
    if (!h) return
    setSelectedHendelse(id)
    setEditStatus(h.status)
    setEditTittel(h.tittel)
    setEditBeskrivelse(h.beskrivelse)
    setEditSted(h.sted)
    setEditKategoriId(h.kategori_id)
    setEditAlvor(h.alvorlighetsgrad)
    setEditBrannvesenId(h.brannvesen_id)
    // Find the sentral that contains this brannvesen
    const matchedSentral = sentraler.find(s => s.brannvesen_ids.includes(h.brannvesen_id))
    setEditSentralId(matchedSentral?.id || '')
    setEditPressetekst(h.presse_tekst || '')
    setNewUpdate('')
    setEditingUpdateId(null)
  }

  const handleSaveChanges = async () => {
    if (!selectedH) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Du må være innlogget'); return }

      // Build update object with all changed fields
      const updateData: Record<string, unknown> = {}
      if (editStatus !== selectedH.status) {
        updateData.status = editStatus
        if (editStatus === 'avsluttet') updateData.avsluttet_tidspunkt = new Date().toISOString()
      }
      if (editTittel !== selectedH.tittel) updateData.tittel = editTittel
      if (editBeskrivelse !== selectedH.beskrivelse) updateData.beskrivelse = editBeskrivelse
      if (editSted !== selectedH.sted) updateData.sted = editSted
      if (editKategoriId !== selectedH.kategori_id) updateData.kategori_id = editKategoriId
      if (editAlvor !== selectedH.alvorlighetsgrad) updateData.alvorlighetsgrad = editAlvor
      if (editBrannvesenId !== selectedH.brannvesen_id) updateData.brannvesen_id = editBrannvesenId
      if (editPressetekst !== (selectedH.presse_tekst || '')) updateData.presse_tekst = editPressetekst || null

      if (Object.keys(updateData).length > 0) {
        updateData.oppdatert_tidspunkt = new Date().toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('hendelser') as any).update(updateData).eq('id', selectedH.id)
        if (error) throw error
      }

      // Add update if provided
      if (newUpdate.trim()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('hendelsesoppdateringer') as any).insert({
          hendelse_id: selectedH.id,
          tekst: newUpdate,
          opprettet_av: user.id,
        })
        if (error) throw error
      }

      invalidateCache()
      refetch()
      toast.success('Endringer lagret')
      setSelectedHendelse(null)
    } catch (err) {
      toast.error('Kunne ikke lagre: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEdit = async (updateId: string) => {
    if (!editUpdateText.trim()) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelsesoppdateringer') as any).update({ tekst: editUpdateText }).eq('id', updateId)
      if (error) throw error
      setEditingUpdateId(null)
      invalidateCache()
      refetch()
      toast.success('Oppdatering redigert')
    } catch (err) {
      toast.error('Kunne ikke redigere: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelsesoppdateringer') as any).delete().eq('id', updateId)
      if (error) throw error
      invalidateCache()
      refetch()
      toast.success('Oppdatering slettet')
    } catch (err) {
      toast.error('Kunne ikke slette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const selectedH = selectedHendelse ? allHendelser.find(h => h.id === selectedHendelse) : null

  const layoutRole = isAdmin ? 'admin' as const : is110Admin ? '110-admin' as const : 'operator' as const

  return (
    <DashboardLayout role={layoutRole}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Hendelser</h1>
          <p className="text-sm text-gray-400 mb-3">
            {isScoped ? 'Hendelser for dine 110-sentraler' : 'Administrer hendelser'}
          </p>
          <Link href="/operator/hendelser/ny" className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny hendelse
          </Link>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'alle', label: 'Alle' },
            { value: 'pågår', label: 'Pågår' },
            { value: 'avsluttet', label: 'Avsluttet' },
          ].map((tab) => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${statusFilter === tab.value ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'}`}>
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
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle kategorier</option>
              {kategorier.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
            </select>
            <select value={filterAlvor} onChange={(e) => setFilterAlvor(e.target.value)} className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle alvorlighetsgrader</option>
              <option value="lav">Lav</option>
              <option value="middels">Middels</option>
              <option value="høy">Høy</option>
              <option value="kritisk">Kritisk</option>
            </select>
            <select value={filterSentral} onChange={(e) => setFilterSentral(e.target.value)} className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle 110-sentraler</option>
              {sentraler.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
            </select>
            <select value={filterFylke} onChange={(e) => { setFilterFylke(e.target.value); setFilterKommune(''); setFilterBrannvesen('') }} className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle fylker</option>
              {fylker.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
            </select>
            {filterFylke && (
              <select value={filterKommune} onChange={(e) => setFilterKommune(e.target.value)} className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
                <option value="">Alle kommuner</option>
                {filteredKommuner.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
              </select>
            )}
            <select value={filterBrannvesen} onChange={(e) => setFilterBrannvesen(e.target.value)} className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle brannvesen</option>
              {filteredBrannvesenList.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="px-3 py-2.5 text-xs text-red-400 hover:text-red-300 touch-manipulation">Nullstill filtre ({activeFilterCount})</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Tittel</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Kategori</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">110-sentral</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Alvor</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Oppdateringer</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden sm:table-cell">Opprettet</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden sm:table-cell">Sist oppdatert</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {hendelser.map((h) => {
                  const bv = brannvesen.find((b) => b.id === h.brannvesen_id)
                  const sentral = sentraler.find((s) => s.brannvesen_ids.includes(h.brannvesen_id))
                  const kat = kategorier.find((k) => k.id === h.kategori_id)
                  const updCount = h.oppdateringer?.length || 0
                  const lastActivity = h.oppdateringer && h.oppdateringer.length > 0
                    ? h.oppdateringer[h.oppdateringer.length - 1].opprettet_tidspunkt
                    : h.oppdatert_tidspunkt
                  return (
                    <tr key={h.id} onClick={() => openHendelse(h.id)} className="border-b border-[#2a2a2a] hover:bg-[#222] transition-colors cursor-pointer">
                      <td className="px-3 sm:px-4 py-3"><StatusBadge status={h.status} size="sm" /></td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className="text-sm text-white font-medium">{h.tittel}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{h.sted}</p>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                        {kat && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: kat.farge + '22', color: kat.farge }}>{kat.navn}</span>}
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell"><span className="text-xs text-gray-400">{sentral?.kort_navn || bv?.kort_navn}</span></td>
                      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell"><SeverityDot severity={h.alvorlighetsgrad} showLabel /></td>
                      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                        {updCount > 0 ? (
                          <span className="text-xs text-blue-400">{updCount}</span>
                        ) : (
                          <span className="text-xs text-gray-600">0</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell"><span className="text-xs text-gray-400">{formatDateTime(h.opprettet_tidspunkt)}</span></td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        {lastActivity && new Date(lastActivity).getTime() - new Date(h.opprettet_tidspunkt).getTime() > 60000
                          ? <span className="text-xs text-gray-400">{formatTimeAgo(lastActivity)}</span>
                          : <span className="text-xs text-gray-600">-</span>
                        }
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openHendelse(h.id)} className="text-xs text-blue-400 hover:text-blue-300 py-1 touch-manipulation">Rediger</button>
                          {hasAdminAccess && (
                            <button onClick={() => setDeactivateConfirm(h.id)} className="text-xs text-red-400 hover:text-red-300 py-1 touch-manipulation">Deaktiver</button>
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
              {allHendelser.find(h => h.id === deactivateConfirm)?.tittel}
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

      {/* Hendelse edit modal */}
      {selectedH && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedHendelse(null)} />
          <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Rediger hendelse</h2>
              <button onClick={() => setSelectedHendelse(null)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Editable fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tittel</label>
                <input type="text" value={editTittel} onChange={(e) => setEditTittel(e.target.value)} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Beskrivelse</label>
                <textarea value={editBeskrivelse} onChange={(e) => setEditBeskrivelse(e.target.value)} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 h-20 resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sted</label>
                  <input type="text" value={editSted} onChange={(e) => setEditSted(e.target.value)} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <div className="flex gap-2">
                    {['pågår', 'avsluttet'].map(s => (
                      <button key={s} onClick={() => setEditStatus(s)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${editStatus === s ? (s === 'pågår' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30') : 'bg-[#0a0a0a] text-gray-400 border border-[#2a2a2a]'}`}>
                        {s === 'pågår' ? 'Pågår' : 'Avsluttet'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kategori</label>
                  <select value={editKategoriId} onChange={(e) => setEditKategoriId(e.target.value)} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    {kategorier.map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alvorlighetsgrad</label>
                  <select value={editAlvor} onChange={(e) => setEditAlvor(e.target.value)} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="lav">Lav</option>
                    <option value="middels">Middels</option>
                    <option value="høy">Høy</option>
                    <option value="kritisk">Kritisk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">110-sentral</label>
                  <select value={editSentralId} onChange={(e) => { setEditSentralId(e.target.value); setEditBrannvesenId('') }} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Velg 110-sentral</option>
                    {sentraler.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Brannvesen</label>
                  <select value={editBrannvesenId} onChange={(e) => setEditBrannvesenId(e.target.value)} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Velg brannvesen</option>
                    {(editSentralId
                      ? brannvesen.filter(b => sentraler.find(s => s.id === editSentralId)?.brannvesen_ids.includes(b.id))
                      : brannvesen
                    ).sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pressemelding</label>
                <textarea value={editPressetekst} onChange={(e) => setEditPressetekst(e.target.value)} placeholder="Skriv pressemelding..." className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 h-16 resize-none" />
              </div>
            </div>

            {/* Oppdateringer section */}
            <div className="border-t border-[#2a2a2a] pt-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">Oppdateringer ({selectedH.oppdateringer?.length || 0})</h3>

              {/* Existing updates - editable */}
              {(selectedH.oppdateringer?.length ?? 0) > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedH.oppdateringer?.map(u => (
                    <div key={u.id} className="bg-[#0a0a0a] rounded-lg p-3">
                      {editingUpdateId === u.id ? (
                        <div>
                          <textarea value={editUpdateText} onChange={(e) => setEditUpdateText(e.target.value)} className="w-full px-2 py-1.5 bg-[#111] border border-blue-500/50 rounded text-white text-sm focus:outline-none h-16 resize-none" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleUpdateEdit(u.id)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs">Lagre</button>
                            <button onClick={() => setEditingUpdateId(null)} className="px-3 py-1 text-gray-400 text-xs">Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300">{u.tekst}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDateTime(u.opprettet_tidspunkt)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setEditingUpdateId(u.id); setEditUpdateText(u.tekst) }} className="p-1 text-gray-500 hover:text-blue-400" title="Rediger">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteUpdate(u.id)} className="p-1 text-gray-500 hover:text-red-400" title="Slett">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new update */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ny oppdatering</label>
                <textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="Skriv en oppdatering..." className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 h-16 resize-none" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleSaveChanges} disabled={saving} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">
                {saving ? 'Lagrer...' : 'Lagre endringer'}
              </button>
              <button onClick={() => setSelectedHendelse(null)} className="py-3 sm:px-4 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors touch-manipulation">Lukk</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

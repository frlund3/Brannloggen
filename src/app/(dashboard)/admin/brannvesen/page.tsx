'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useBrannvesen, useFylker, useKommuner, useSentraler, invalidateCache } from '@/hooks/useSupabaseData'
import type { Brannvesen } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function AdminBrannvesenPage() {
  const { isAdmin, is110Admin, isScoped, filterBrannvesen } = useSentralScope()
  const { data: brannvesenData, loading: brannvesenLoading } = useBrannvesen()
  const { data: fylkerData, loading: fylkerLoading } = useFylker()
  const { data: kommunerData, loading: kommunerLoading } = useKommuner()
  const { data: sentralerData, loading: sentralerLoading } = useSentraler()
  const [items, setItems] = useState<Brannvesen[]>([])
  const [search, setSearch] = useState('')
  const [selectedFylke, setSelectedFylke] = useState('')
  const [selectedSentral, setSelectedSentral] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Brannvesen | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ navn: '', kort_navn: '', fylke_id: '', kommune_ids: [] as string[] })

  useEffect(() => { if (brannvesenData.length > 0) setItems(brannvesenData) }, [brannvesenData])

  // Scope items for 110-admin
  const scopedItems = isScoped ? filterBrannvesen(items) : items

  const filtered = scopedItems
    .filter((b) => {
      if (selectedFylke && b.fylke_id !== selectedFylke) return false
      if (selectedSentral) {
        const sentral = sentralerData.find(s => s.id === selectedSentral)
        if (sentral && !sentral.brannvesen_ids.includes(b.id)) return false
      }
      if (search && !b.navn.toLowerCase().includes(search.toLowerCase()) && !b.kort_navn.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => a.navn.localeCompare(b.navn, 'no'))

  const getSentral = (bvId: string) => sentralerData.find(s => s.brannvesen_ids.includes(bvId))

  const resetForm = () => setForm({ navn: '', kort_navn: '', fylke_id: '', kommune_ids: [] })

  const handleAdd = async () => {
    if (!form.navn || !form.kort_navn || !form.fylke_id) return
    const id = 'bv-' + form.kort_navn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const newItem = { id, navn: form.navn, kort_navn: form.kort_navn, fylke_id: form.fylke_id, kommune_ids: form.kommune_ids, aktiv: true }
    setItems([...items, newItem])
    resetForm()
    setShowAdd(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brannvesen').insert(newItem as any)
      if (error) throw error
      invalidateCache()
      toast.success('Brannvesen opprettet')
    } catch (err) {
      setItems(items.filter(b => b.id !== id))
      toast.error('Kunne ikke opprette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleEdit = (item: Brannvesen) => {
    setEditItem(item)
    setForm({ navn: item.navn, kort_navn: item.kort_navn, fylke_id: item.fylke_id, kommune_ids: [...item.kommune_ids] })
  }

  const handleSaveEdit = async () => {
    if (!editItem || !form.navn || !form.kort_navn || !form.fylke_id) return
    const prev = [...items]
    setItems(items.map(b => b.id === editItem.id ? { ...b, ...form } : b))
    setEditItem(null)
    resetForm()
    try {
      const supabase = createClient()
      const { error } = await supabase.from('brannvesen').update({ navn: form.navn, kort_navn: form.kort_navn, fylke_id: form.fylke_id, kommune_ids: form.kommune_ids } as any).eq('id', editItem.id)
      if (error) throw error
      invalidateCache()
      toast.success('Brannvesen oppdatert')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke oppdatere: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDelete = async (id: string) => {
    const prev = [...items]
    setItems(items.filter(b => b.id !== id))
    setDeleteConfirm(null)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('brannvesen') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('Brannvesen slettet')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke slette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const toggleKommune = (kid: string) => {
    setForm(prev => ({
      ...prev,
      kommune_ids: prev.kommune_ids.includes(kid) ? prev.kommune_ids.filter(x => x !== kid) : [...prev.kommune_ids, kid]
    }))
  }

  const filteredKommuner = form.fylke_id ? kommunerData.filter(k => k.fylke_id === form.fylke_id) : kommunerData

  if (brannvesenLoading || fylkerLoading || kommunerLoading || sentralerLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-4 lg:p-8">
          <p className="text-gray-400">Laster...</p>
        </div>
      </DashboardLayout>
    )
  }

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Navn</label>
        <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Kort navn</label>
        <input type="text" value={form.kort_navn} onChange={(e) => setForm({ ...form, kort_navn: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Fylke</label>
        <select value={form.fylke_id} onChange={(e) => setForm({ ...form, fylke_id: e.target.value, kommune_ids: [] })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Velg fylke</option>
          {fylkerData.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
        </select>
      </div>
      {form.fylke_id && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">Kommuner</label>
          <div className="max-h-48 overflow-y-auto bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2 space-y-1">
            {filteredKommuner.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(k => (
              <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] cursor-pointer">
                <input type="checkbox" checked={form.kommune_ids.includes(k.id)} onChange={() => toggleKommune(k.id)} className="rounded border-gray-600" />
                <span className="text-sm text-white">{k.navn}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Brannvesen</h1>
          <p className="text-sm text-gray-400 mb-3">
            {isScoped ? `${scopedItems.length} brannvesen i dine sentraler` : `${items.length} brannvesen registrert`}
          </p>
          {isAdmin && (
            <button onClick={() => { resetForm(); setShowAdd(true) }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nytt brannvesen
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk etter brannvesen..." className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64" />
          <select value={selectedFylke} onChange={(e) => setSelectedFylke(e.target.value)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle fylker</option>
            {fylkerData.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
          </select>
          <select value={selectedSentral} onChange={(e) => setSelectedSentral(e.target.value)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle 110-sentraler</option>
            {sentralerData.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
          </select>
        </div>

        <p className="text-xs text-gray-500 mb-3">Viser {filtered.length} av {scopedItems.length} brannvesen</p>

        <div className="space-y-3">
          {filtered.map((b) => {
            const fylke = fylkerData.find(f => f.id === b.fylke_id)
            const sentral = getSentral(b.id)
            const bKommuner = b.kommune_ids.map(kid => kommunerData.find(k => k.id === kid)).filter(Boolean)
            const isExpanded = expandedId === b.id

            return (
              <div key={b.id} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
                <div className="px-4 py-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : b.id)} className="flex items-center gap-3 text-left w-full touch-manipulation">
                    <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium">{b.navn}</p>
                      <p className="text-xs text-gray-500">
                        {fylke?.navn}
                        {sentral && <> &middot; <span className="text-orange-400">{sentral.kort_navn}</span></>}
                        {bKommuner.length > 0 && <> &middot; {bKommuner.length} kommuner</>}
                      </p>
                    </div>
                  </button>
                  {isAdmin ? (
                    <div className="flex items-center gap-3 mt-2 ml-7">
                      <button onClick={() => handleEdit(b)} className="text-xs text-blue-400 hover:text-blue-300 py-1 touch-manipulation">Rediger</button>
                      <button onClick={() => setDeleteConfirm(b.id)} className="text-xs text-red-400 hover:text-red-300 py-1 touch-manipulation">Slett</button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 mt-2 ml-7 block">Kun visning</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-[#2a2a2a] pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Kommuner ({bKommuner.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {bKommuner.sort((a, b) => a!.navn.localeCompare(b!.navn, 'no')).map(k => (
                            <span key={k!.id} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{k!.navn}</span>
                          ))}
                          {bKommuner.length === 0 && <span className="text-xs text-gray-500">Ingen kommuner tilknyttet</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Detaljer</p>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Kort navn: <span className="text-white">{b.kort_navn}</span></p>
                          <p className="text-xs text-gray-500">Fylke: <span className="text-white">{fylke?.navn || '-'}</span></p>
                          <p className="text-xs text-gray-500">110-sentral: <span className={sentral ? 'text-orange-400' : 'text-gray-600'}>{sentral?.kort_navn || 'Ikke tilknyttet'}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Nytt brannvesen</h2>
              {formContent}
              <div className="flex gap-3 mt-6">
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Legg til</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditItem(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Rediger brannvesen</h2>
              {formContent}
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Lagre</button>
                <button onClick={() => setEditItem(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-white mb-2">Slett brannvesen?</h2>
              <p className="text-sm text-gray-400 mb-6">Er du sikker på at du vil slette {items.find(b => b.id === deleteConfirm)?.navn}?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">Slett</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

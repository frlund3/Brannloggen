'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useSentraler, useFylker, useBrannvesen, invalidateCache } from '@/hooks/useSupabaseData'
import type { Sentral } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function AdminSentralerPage() {
  const { isAdmin, is110Admin, isScoped, filterSentraler } = useSentralScope()
  const { data: sentralerData, loading: sentralerLoading } = useSentraler()
  const { data: fylkerData, loading: fylkerLoading } = useFylker()
  const { data: brannvesenData, loading: brannvesenLoading } = useBrannvesen()
  const [items, setItems] = useState<Sentral[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Sentral | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ navn: '', kort_navn: '', kontakt_epost: '', fylke_ids: [] as string[], brannvesen_ids: [] as string[] })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { if (sentralerData.length > 0) setItems(sentralerData) }, [sentralerData])

  const resetForm = () => setForm({ navn: '', kort_navn: '', kontakt_epost: '', fylke_ids: [], brannvesen_ids: [] })

  const handleAdd = async () => {
    if (!form.navn || !form.kort_navn) return
    const id = 's-' + form.kort_navn.toLowerCase().replace(/\s+/g, '-').replace(/110-?/g, '').replace(/[^a-z0-9-]/g, '')
    const newItem = { id, ...form }
    setItems([...items, newItem])
    resetForm()
    setShowAdd(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('sentraler').insert(newItem as any)
      if (error) throw error
      invalidateCache()
      toast.success('110-sentral opprettet')
    } catch (err) {
      setItems(items.filter(s => s.id !== id))
      toast.error('Kunne ikke opprette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleEdit = (item: Sentral) => {
    setEditItem(item)
    setForm({ navn: item.navn, kort_navn: item.kort_navn, kontakt_epost: item.kontakt_epost || '', fylke_ids: [...item.fylke_ids], brannvesen_ids: [...item.brannvesen_ids] })
  }

  const handleSaveEdit = async () => {
    if (!editItem || !form.navn || !form.kort_navn) return
    const prev = [...items]
    setItems(items.map(s => s.id === editItem.id ? { ...s, ...form } : s))
    setEditItem(null)
    resetForm()
    try {
      const supabase = createClient()
      const { error } = await supabase.from('sentraler').update({ navn: form.navn, kort_navn: form.kort_navn, kontakt_epost: form.kontakt_epost || null, fylke_ids: form.fylke_ids, brannvesen_ids: form.brannvesen_ids } as any).eq('id', editItem.id)
      if (error) throw error
      invalidateCache()
      toast.success('110-sentral oppdatert')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke oppdatere: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDelete = async (id: string) => {
    const prev = [...items]
    setItems(items.filter(s => s.id !== id))
    setDeleteConfirm(null)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('sentraler') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('110-sentral slettet')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke slette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const toggleFylke = (fid: string) => {
    setForm(prev => ({
      ...prev,
      fylke_ids: prev.fylke_ids.includes(fid) ? prev.fylke_ids.filter(x => x !== fid) : [...prev.fylke_ids, fid]
    }))
  }

  const toggleBrannvesen = (bid: string) => {
    setForm(prev => ({
      ...prev,
      brannvesen_ids: prev.brannvesen_ids.includes(bid) ? prev.brannvesen_ids.filter(x => x !== bid) : [...prev.brannvesen_ids, bid]
    }))
  }

  // Filter brannvesen by selected fylker
  const filteredBrannvesen = form.fylke_ids.length > 0
    ? brannvesenData.filter(b => form.fylke_ids.includes(b.fylke_id))
    : brannvesenData

  const displayItems = isScoped ? filterSentraler(items) : items

  if (sentralerLoading || fylkerLoading || brannvesenLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-4 lg:p-8">
          <p className="text-theme-secondary">Laster...</p>
        </div>
      </DashboardLayout>
    )
  }

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-theme-secondary mb-1">Navn</label>
        <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} placeholder="Rogaland 110-sentral" className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-theme-secondary mb-1">Kort navn</label>
        <input type="text" value={form.kort_navn} onChange={(e) => setForm({ ...form, kort_navn: e.target.value })} placeholder="Rogaland 110" className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-theme-secondary mb-1">Kontakt e-post</label>
        <input type="email" value={form.kontakt_epost} onChange={(e) => setForm({ ...form, kontakt_epost: e.target.value })} placeholder="post@110sentral.no" className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-theme-secondary mb-2">Fylker</label>
        <div className="max-h-40 overflow-y-auto bg-theme-card-inner border border-theme rounded-lg p-2 space-y-1">
          {fylkerData.map(f => (
            <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-theme-card cursor-pointer">
              <input type="checkbox" checked={form.fylke_ids.includes(f.id)} onChange={() => toggleFylke(f.id)} className="rounded border-gray-600" />
              <span className="text-sm text-theme">{f.navn}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-theme-secondary mb-2">Brannvesen {form.fylke_ids.length > 0 && <span className="text-xs text-theme-muted">(filtrert etter valgte fylker)</span>}</label>
        <div className="max-h-48 overflow-y-auto bg-theme-card-inner border border-theme rounded-lg p-2 space-y-1">
          {filteredBrannvesen.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => (
            <label key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-theme-card cursor-pointer">
              <input type="checkbox" checked={form.brannvesen_ids.includes(b.id)} onChange={() => toggleBrannvesen(b.id)} className="rounded border-gray-600" />
              <span className="text-sm text-theme">{b.kort_navn}</span>
              <span className="text-xs text-theme-muted ml-auto">{fylkerData.find(f => f.id === b.fylke_id)?.navn}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme">110-sentraler</h1>
          <p className="text-sm text-theme-secondary mb-3">
            {isScoped ? `${displayItems.length} sentraler du har tilgang til` : `${items.length} sentraler registrert`}
          </p>
          {isAdmin && (
            <button onClick={() => { resetForm(); setShowAdd(true) }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Ny 110-sentral
            </button>
          )}
        </div>

        <div className="space-y-3">
          {displayItems.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((s) => {
            const sFylker = fylkerData.filter(f => s.fylke_ids.includes(f.id))
            const sBrannvesen = brannvesenData.filter(b => s.brannvesen_ids.includes(b.id))
            const isExpanded = expandedId === s.id

            return (
              <div key={s.id} className="bg-theme-card rounded-xl border border-theme overflow-hidden">
                <div className="px-4 py-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="flex items-center gap-3 text-left w-full touch-manipulation">
                    <svg className={`w-4 h-4 text-theme-secondary transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <p className="text-sm text-theme font-medium">{s.navn}</p>
                      <p className="text-xs text-theme-muted">
                        {sFylker.map(f => f.navn).join(', ')} &middot; {sBrannvesen.length} brannvesen
                        {s.kontakt_epost && <> &middot; {s.kontakt_epost}</>}
                      </p>
                    </div>
                  </button>
                  {isAdmin ? (
                    <div className="flex items-center gap-3 mt-2 ml-7">
                      <button onClick={() => handleEdit(s)} className="text-xs text-blue-400 hover:text-blue-300 py-1 touch-manipulation">Rediger</button>
                      <button onClick={() => setDeleteConfirm(s.id)} className="text-xs text-red-400 hover:text-red-300 py-1 touch-manipulation">Slett</button>
                    </div>
                  ) : (
                    <span className="text-xs text-theme-muted mt-2 ml-7 block">Kun visning</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-theme pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-theme-secondary mb-2">Fylker ({sFylker.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {sFylker.map(f => (
                            <span key={f.id} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{f.navn}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-theme-secondary mb-2">Brannvesen ({sBrannvesen.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {sBrannvesen.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => (
                            <span key={b.id} className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded">{b.kort_navn}</span>
                          ))}
                          {sBrannvesen.length === 0 && <span className="text-xs text-theme-muted">Ingen brannvesen tilknyttet</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setShowAdd(false)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-theme mb-4">Ny 110-sentral</h2>
              {formContent}
              <div className="flex gap-3 mt-6">
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Legg til</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-theme-card-inner border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setEditItem(null)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-theme mb-4">Rediger 110-sentral</h2>
              {formContent}
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Lagre</button>
                <button onClick={() => setEditItem(null)} className="px-4 py-2.5 bg-theme-card-inner border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-theme mb-2">Slett 110-sentral?</h2>
              <p className="text-sm text-theme-secondary mb-6">Er du sikker på at du vil slette {items.find(s => s.id === deleteConfirm)?.navn}?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">Slett</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 bg-theme-card-inner border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

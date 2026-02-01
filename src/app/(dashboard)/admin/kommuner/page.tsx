'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useKommuner, useFylker, invalidateCache } from '@/hooks/useSupabaseData'
import type { Kommune } from '@/hooks/useSupabaseData'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function AdminKommunerPage() {
  const { data: kommunerData, loading: kommunerLoading } = useKommuner()
  const { data: fylkerData, loading: fylkerLoading } = useFylker()
  const [items, setItems] = useState<Kommune[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Kommune | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ navn: '', nummer: '', fylke_id: '' })
  const [search, setSearch] = useState('')
  const [filterFylke, setFilterFylke] = useState('')

  useEffect(() => { if (kommunerData.length > 0) setItems(kommunerData) }, [kommunerData])

  const filtered = items
    .filter(k => {
      if (filterFylke && k.fylke_id !== filterFylke) return false
      if (search && !k.navn.toLowerCase().includes(search.toLowerCase()) && !k.nummer.includes(search)) return false
      return true
    })
    .sort((a, b) => a.navn.localeCompare(b.navn, 'no'))

  const handleAdd = async () => {
    if (!form.navn || !form.nummer || !form.fylke_id) return
    const id = `k-${form.nummer}`
    const newItem = { id, navn: form.navn, nummer: form.nummer, fylke_id: form.fylke_id }
    setItems([...items, newItem])
    setForm({ navn: '', nummer: '', fylke_id: '' })
    setShowAdd(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('kommuner').insert(newItem as any)
      if (error) throw error
      invalidateCache()
      toast.success('Kommune opprettet')
    } catch (err) {
      setItems(items.filter(k => k.id !== id))
      toast.error('Kunne ikke opprette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleEdit = (item: Kommune) => {
    setEditItem(item)
    setForm({ navn: item.navn, nummer: item.nummer, fylke_id: item.fylke_id })
  }

  const handleSaveEdit = async () => {
    if (!editItem || !form.navn || !form.nummer || !form.fylke_id) return
    const prev = [...items]
    setItems(items.map(k => k.id === editItem.id ? { ...k, navn: form.navn, nummer: form.nummer, fylke_id: form.fylke_id } : k))
    setEditItem(null)
    setForm({ navn: '', nummer: '', fylke_id: '' })
    try {
      const supabase = createClient()
      const { error } = await supabase.from('kommuner').update({ navn: form.navn, nummer: form.nummer, fylke_id: form.fylke_id } as any).eq('id', editItem.id)
      if (error) throw error
      invalidateCache()
      toast.success('Kommune oppdatert')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke oppdatere: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDelete = async (id: string) => {
    const prev = [...items]
    setItems(items.filter(k => k.id !== id))
    setDeleteConfirm(null)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('kommuner') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('Kommune slettet')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke slette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  if (kommunerLoading || fylkerLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-4 lg:p-8">
          <p className="text-theme-secondary">Laster...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme">Kommuner</h1>
            <p className="text-sm text-theme-secondary mb-3">{items.length} kommuner registrert</p>
          </div>
          <button onClick={() => { setForm({ navn: '', nummer: '', fylke_id: '' }); setShowAdd(true) }} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2 touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny kommune
          </button>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk etter kommune..." className="px-4 py-2 bg-theme-card border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64" />
          <select value={filterFylke} onChange={(e) => setFilterFylke(e.target.value)} className="px-4 py-2 bg-theme-card border border-theme rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle fylker</option>
            {fylkerData.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
          </select>
        </div>

        <p className="text-xs text-theme-muted mb-3">Viser {Math.min(filtered.length, 100)} av {filtered.length} kommuner{filtered.length > 100 ? ' (bruk søk eller filter for å se flere)' : ''}</p>

        <div className="space-y-2">
          {filtered.slice(0, 100).map((k) => {
            const fylke = fylkerData.find(f => f.id === k.fylke_id)
            return (
              <div key={k.id} className="bg-theme-card rounded-xl border border-theme px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-theme font-medium">{k.navn}</p>
                    <p className="text-xs text-theme-muted">Nr. {k.nummer}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {fylke && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded hidden sm:inline">{fylke.navn}</span>}
                    <button onClick={() => handleEdit(k)} className="text-xs text-blue-400 hover:text-blue-300 py-1 touch-manipulation">Rediger</button>
                    <button onClick={() => setDeleteConfirm(k.id)} className="text-xs text-red-400 hover:text-red-300 py-1 touch-manipulation">Slett</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setShowAdd(false)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold text-theme mb-4">Ny kommune</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Navn</label>
                  <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Kommunenummer</label>
                  <input type="text" value={form.nummer} onChange={(e) => setForm({ ...form, nummer: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Fylke</label>
                  <select value={form.fylke_id} onChange={(e) => setForm({ ...form, fylke_id: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Velg fylke</option>
                    {fylkerData.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Legg til</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setEditItem(null)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold text-theme mb-4">Rediger kommune</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Navn</label>
                  <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Kommunenummer</label>
                  <input type="text" value={form.nummer} onChange={(e) => setForm({ ...form, nummer: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Fylke</label>
                  <select value={form.fylke_id} onChange={(e) => setForm({ ...form, fylke_id: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Velg fylke</option>
                    {fylkerData.map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Lagre</button>
                <button onClick={() => setEditItem(null)} className="px-4 py-2.5 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-theme mb-2">Slett kommune?</h2>
              <p className="text-sm text-theme-secondary mb-6">Er du sikker på at du vil slette {items.find(k => k.id === deleteConfirm)?.navn}?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm!)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Slett</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

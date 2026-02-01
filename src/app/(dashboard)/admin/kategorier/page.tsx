'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconPicker } from '@/components/ui/IconPicker'
import { useKategorier, invalidateCache } from '@/hooks/useSupabaseData'
import type { Kategori } from '@/hooks/useSupabaseData'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function AdminKategorierPage() {
  const { data: kategorierData, loading: kategorierLoading } = useKategorier()
  const [items, setItems] = useState<Kategori[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Kategori | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ navn: '', ikon: '', farge: '#DC2626', beskrivelse: '' })

  useEffect(() => { if (kategorierData.length > 0) setItems(kategorierData) }, [kategorierData])

  const handleAdd = async () => {
    if (!form.navn) return
    const id = 'kat-' + form.navn.toLowerCase().replace(/\s+/g, '-').replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
    const newItem = { id, navn: form.navn, ikon: form.ikon || 'Flame', farge: form.farge, beskrivelse: form.beskrivelse || null }
    setItems([...items, newItem])
    setForm({ navn: '', ikon: '', farge: '#DC2626', beskrivelse: '' })
    setShowAdd(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('kategorier').insert(newItem as any)
      if (error) throw error
      invalidateCache()
      toast.success('Kategori opprettet')
    } catch (err) {
      setItems(items.filter(k => k.id !== id))
      toast.error('Kunne ikke opprette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleEdit = (item: Kategori) => {
    setEditItem(item)
    setForm({ navn: item.navn, ikon: item.ikon, farge: item.farge, beskrivelse: item.beskrivelse || '' })
  }

  const handleSaveEdit = async () => {
    if (!editItem || !form.navn) return
    const prev = [...items]
    setItems(items.map(k => k.id === editItem.id ? { ...k, navn: form.navn, ikon: form.ikon || 'Flame', farge: form.farge, beskrivelse: form.beskrivelse || null } : k))
    setEditItem(null)
    setForm({ navn: '', ikon: '', farge: '#DC2626', beskrivelse: '' })
    try {
      const supabase = createClient()
      const { error } = await supabase.from('kategorier').update({ navn: form.navn, ikon: form.ikon || 'Flame', farge: form.farge, beskrivelse: form.beskrivelse || null } as any).eq('id', editItem.id)
      if (error) throw error
      invalidateCache()
      toast.success('Kategori oppdatert')
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
      const { error } = await (supabase.from('kategorier') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('Kategori slettet')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke slette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  if (kategorierLoading) {
    return (
      <DashboardLayout role="admin">
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
        <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <IconPicker value={form.ikon} onChange={(v) => setForm({ ...form, ikon: v })} color={form.farge} />
      <div>
        <label className="block text-sm text-theme-secondary mb-1">Farge</label>
        <div className="flex items-center gap-3">
          <input type="color" value={form.farge} onChange={(e) => setForm({ ...form, farge: e.target.value })} className="w-10 h-10 rounded border border-theme-input bg-transparent cursor-pointer" />
          <input type="text" value={form.farge} onChange={(e) => setForm({ ...form, farge: e.target.value })} className="flex-1 px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500 font-mono" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-theme-secondary mb-1">Beskrivelse</label>
        <textarea value={form.beskrivelse} onChange={(e) => setForm({ ...form, beskrivelse: e.target.value })} rows={2} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
    </div>
  )

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme">Hendelseskategorier</h1>
            <p className="text-sm text-theme-secondary mb-3">{items.length} kategorier registrert</p>
          </div>
          <button onClick={() => { setForm({ navn: '', ikon: '', farge: '#DC2626', beskrivelse: '' }); setShowAdd(true) }} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2 touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny kategori
          </button>
        </div>

        <div className="bg-theme-card rounded-xl border border-theme overflow-hidden">
          {items.map((kat, i) => (
            <div key={kat.id} className={`flex items-center justify-between px-4 py-3 ${i < items.length - 1 ? 'border-b border-theme' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: kat.farge + '22', color: kat.farge }}>
                  <CategoryIcon iconName={kat.ikon} className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm text-theme font-medium">{kat.navn}</p>
                  {kat.beskrivelse && <p className="text-xs text-theme-muted">{kat.beskrivelse}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(kat)} className="text-xs text-blue-400 hover:text-blue-300 touch-manipulation">Rediger</button>
                <button onClick={() => setDeleteConfirm(kat.id)} className="text-xs text-red-400 hover:text-red-300 touch-manipulation">Slett</button>
              </div>
            </div>
          ))}
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setShowAdd(false)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold text-theme mb-4">Ny kategori</h2>
              {formContent}
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
              <h2 className="text-lg font-bold text-theme mb-4">Rediger kategori</h2>
              {formContent}
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
              <h2 className="text-lg font-bold text-theme mb-2">Slett kategori?</h2>
              <p className="text-sm text-theme-secondary mb-6">Er du sikker på at du vil slette {items.find(k => k.id === deleteConfirm)?.navn}?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Slett</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

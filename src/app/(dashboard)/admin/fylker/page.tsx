'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useFylker, useKommuner, invalidateCache } from '@/hooks/useSupabaseData'
import type { Fylke } from '@/hooks/useSupabaseData'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function AdminFylkerPage() {
  const { data: fylkerData, loading: fylkerLoading } = useFylker()
  const { data: kommunerData, loading: kommunerLoading } = useKommuner()
  const [items, setItems] = useState<Fylke[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Fylke | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ navn: '', nummer: '' })
  const [search, setSearch] = useState('')

  useEffect(() => { if (fylkerData.length > 0) setItems(fylkerData) }, [fylkerData])

  const filtered = items.filter(f =>
    !search || f.navn.toLowerCase().includes(search.toLowerCase()) || f.nummer.includes(search)
  ).sort((a, b) => a.navn.localeCompare(b.navn, 'no'))

  const handleAdd = async () => {
    if (!form.navn || !form.nummer) return
    const id = `f-${form.nummer}`
    const newItem = { id, navn: form.navn, nummer: form.nummer }
    setItems([...items, newItem])
    setForm({ navn: '', nummer: '' })
    setShowAdd(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('fylker').insert(newItem as any)
      if (error) throw error
      invalidateCache()
      toast.success('Fylke opprettet')
    } catch (err) {
      setItems(items.filter(f => f.id !== id))
      toast.error('Kunne ikke opprette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleEdit = (item: Fylke) => {
    setEditItem(item)
    setForm({ navn: item.navn, nummer: item.nummer })
  }

  const handleSaveEdit = async () => {
    if (!editItem || !form.navn || !form.nummer) return
    const prev = [...items]
    setItems(items.map(f => f.id === editItem.id ? { ...f, navn: form.navn, nummer: form.nummer } : f))
    setEditItem(null)
    setForm({ navn: '', nummer: '' })
    try {
      const supabase = createClient()
      // @ts-expect-error supabase types not generated
      const { error } = await supabase.from('fylker').update({ navn: form.navn, nummer: form.nummer } as any).eq('id', editItem.id)
      if (error) throw error
      invalidateCache()
      toast.success('Fylke oppdatert')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke oppdatere: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDelete = async (id: string) => {
    const prev = [...items]
    setItems(items.filter(f => f.id !== id))
    setDeleteConfirm(null)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('fylker') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('Fylke slettet')
    } catch (err) {
      setItems(prev)
      toast.error('Kunne ikke slette: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  if (fylkerLoading || kommunerLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-4 lg:p-8">
          <p className="text-gray-400">Laster...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Fylker</h1>
            <p className="text-sm text-gray-400 mb-3">{items.length} fylker registrert</p>
          </div>
          <button onClick={() => { setForm({ navn: '', nummer: '' }); setShowAdd(true) }} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2 touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nytt fylke
          </button>
        </div>

        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk etter fylke..." className="mb-6 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64" />

        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Navn</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Nummer</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Kommuner</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const antallKommuner = kommunerData.filter(k => k.fylke_id === f.id).length
                return (
                  <tr key={f.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                    <td className="px-4 py-3 text-sm text-white font-medium">{f.navn}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{f.nummer}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{antallKommuner}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(f)} className="text-xs text-blue-400 hover:text-blue-300 touch-manipulation">Rediger</button>
                        <button onClick={() => setDeleteConfirm(f.id)} className="text-xs text-red-400 hover:text-red-300 touch-manipulation">Slett</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold text-white mb-4">Nytt fylke</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Navn</label>
                  <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fylkesnummer</label>
                  <input type="text" value={form.nummer} onChange={(e) => setForm({ ...form, nummer: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Legg til</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditItem(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold text-white mb-4">Rediger fylke</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Navn</label>
                  <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fylkesnummer</label>
                  <input type="text" value={form.nummer} onChange={(e) => setForm({ ...form, nummer: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Lagre</button>
                <button onClick={() => setEditItem(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-white mb-2">Slett fylke?</h2>
              <p className="text-sm text-gray-400 mb-6">Er du sikker på at du vil slette {items.find(f => f.id === deleteConfirm)?.navn}?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">Slett</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors touch-manipulation">Avbryt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

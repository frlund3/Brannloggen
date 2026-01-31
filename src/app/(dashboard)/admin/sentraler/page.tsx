'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { sentraler as initialSentraler } from '@/data/sentraler'
import { fylker } from '@/data/fylker'
import { brannvesen } from '@/data/brannvesen'
import { useState } from 'react'

interface SentralItem {
  id: string
  navn: string
  kort_navn: string
  fylke_ids: string[]
  brannvesen_ids: string[]
}

export default function AdminSentralerPage() {
  const [items, setItems] = useState<SentralItem[]>([...initialSentraler])
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<SentralItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ navn: '', kort_navn: '', fylke_ids: [] as string[], brannvesen_ids: [] as string[] })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const resetForm = () => setForm({ navn: '', kort_navn: '', fylke_ids: [], brannvesen_ids: [] })

  const handleAdd = () => {
    if (!form.navn || !form.kort_navn) return
    const id = 's-' + form.kort_navn.toLowerCase().replace(/\s+/g, '-').replace(/110-?/g, '').replace(/[^a-z0-9-]/g, '')
    setItems([...items, { id, ...form }])
    resetForm()
    setShowAdd(false)
  }

  const handleEdit = (item: SentralItem) => {
    setEditItem(item)
    setForm({ navn: item.navn, kort_navn: item.kort_navn, fylke_ids: [...item.fylke_ids], brannvesen_ids: [...item.brannvesen_ids] })
  }

  const handleSaveEdit = () => {
    if (!editItem || !form.navn || !form.kort_navn) return
    setItems(items.map(s => s.id === editItem.id ? { ...s, ...form } : s))
    setEditItem(null)
    resetForm()
  }

  const handleDelete = (id: string) => {
    setItems(items.filter(s => s.id !== id))
    setDeleteConfirm(null)
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
    ? brannvesen.filter(b => form.fylke_ids.includes(b.fylke_id))
    : brannvesen

  const formContent = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Navn</label>
        <input type="text" value={form.navn} onChange={(e) => setForm({ ...form, navn: e.target.value })} placeholder="Rogaland 110-sentral" className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Kort navn</label>
        <input type="text" value={form.kort_navn} onChange={(e) => setForm({ ...form, kort_navn: e.target.value })} placeholder="Rogaland 110" className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">Fylker</label>
        <div className="max-h-40 overflow-y-auto bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2 space-y-1">
          {fylker.map(f => (
            <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] cursor-pointer">
              <input type="checkbox" checked={form.fylke_ids.includes(f.id)} onChange={() => toggleFylke(f.id)} className="rounded border-gray-600" />
              <span className="text-sm text-white">{f.navn}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">Brannvesen {form.fylke_ids.length > 0 && <span className="text-xs text-gray-500">(filtrert etter valgte fylker)</span>}</label>
        <div className="max-h-48 overflow-y-auto bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2 space-y-1">
          {filteredBrannvesen.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => (
            <label key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] cursor-pointer">
              <input type="checkbox" checked={form.brannvesen_ids.includes(b.id)} onChange={() => toggleBrannvesen(b.id)} className="rounded border-gray-600" />
              <span className="text-sm text-white">{b.kort_navn}</span>
              <span className="text-xs text-gray-500 ml-auto">{fylker.find(f => f.id === b.fylke_id)?.navn}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">110-sentraler</h1>
            <p className="text-sm text-gray-400">{items.length} sentraler registrert</p>
          </div>
          <button onClick={() => { resetForm(); setShowAdd(true) }} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny 110-sentral
          </button>
        </div>

        <div className="space-y-3">
          {items.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((s) => {
            const sFylker = fylker.filter(f => s.fylke_ids.includes(f.id))
            const sBrannvesen = brannvesen.filter(b => s.brannvesen_ids.includes(b.id))
            const isExpanded = expandedId === s.id

            return (
              <div key={s.id} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="flex items-center gap-3 text-left flex-1">
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <p className="text-sm text-white font-medium">{s.navn}</p>
                      <p className="text-xs text-gray-500">{sFylker.map(f => f.navn).join(', ')} &middot; {sBrannvesen.length} brannvesen</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(s)} className="text-xs text-blue-400 hover:text-blue-300">Rediger</button>
                    <button onClick={() => setDeleteConfirm(s.id)} className="text-xs text-red-400 hover:text-red-300">Slett</button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-[#2a2a2a] pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Fylker ({sFylker.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {sFylker.map(f => (
                            <span key={f.id} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{f.navn}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Brannvesen ({sBrannvesen.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {sBrannvesen.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => (
                            <span key={b.id} className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded">{b.kort_navn}</span>
                          ))}
                          {sBrannvesen.length === 0 && <span className="text-xs text-gray-500">Ingen brannvesen tilknyttet</span>}
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
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Ny 110-sentral</h2>
              {formContent}
              <div className="flex gap-3 mt-6">
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Legg til</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditItem(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Rediger 110-sentral</h2>
              {formContent}
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Lagre</button>
                <button onClick={() => setEditItem(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-white mb-2">Slett 110-sentral?</h2>
              <p className="text-sm text-gray-400 mb-6">Er du sikker på at du vil slette {items.find(s => s.id === deleteConfirm)?.navn}?</p>
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

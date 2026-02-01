'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useMedier, useBrukerprofiler, invalidateCache } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const MEDIUM_TYPES = [
  { value: 'riksmedia', label: 'Riksmedia' },
  { value: 'regionavis', label: 'Regionavis' },
  { value: 'lokalavis', label: 'Lokalavis' },
  { value: 'nyhetsbyra', label: 'Nyhetsbyrå' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'nettavis', label: 'Nettavis' },
  { value: 'annet', label: 'Annet' },
]

export default function AdminMedierPage() {
  const { isAdmin, is110Admin } = useSentralScope()
  const { data: medier, loading: medierLoading, refetch } = useMedier()
  const { data: brukerprofiler, loading: brukereLoading } = useBrukerprofiler()

  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formNavn, setFormNavn] = useState('')
  const [formType, setFormType] = useState('annet')
  const [formAktiv, setFormAktiv] = useState(true)
  const [saving, setSaving] = useState(false)

  const filtered = medier.filter(m =>
    m.navn.toLowerCase().includes(search.toLowerCase()) ||
    m.type.toLowerCase().includes(search.toLowerCase())
  )

  const presseBrukere = brukerprofiler.filter(b => b.rolle === 'presse')
  const getPresseForMedium = (mediumId: string) => presseBrukere.filter(b => b.medium_id === mediumId)

  const typeLabel = (type: string) => MEDIUM_TYPES.find(t => t.value === type)?.label || type

  const resetForm = () => {
    setFormNavn('')
    setFormType('annet')
    setFormAktiv(true)
    setShowAdd(false)
    setEditId(null)
  }

  const openEdit = (m: { id: string; navn: string; type: string; aktiv: boolean }) => {
    setEditId(m.id)
    setFormNavn(m.navn)
    setFormType(m.type)
    setFormAktiv(m.aktiv)
    setShowAdd(false)
  }

  const handleSave = async () => {
    if (!formNavn.trim()) { toast.error('Navn er påkrevd'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      if (editId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('medier') as any).update({
          navn: formNavn.trim(),
          type: formType,
          aktiv: formAktiv,
        }).eq('id', editId)
        if (error) throw error
        toast.success('Medium oppdatert')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('medier') as any).insert({
          navn: formNavn.trim(),
          type: formType,
          aktiv: formAktiv,
        })
        if (error) {
          if (error.code === '23505') {
            toast.error('Et medium med dette navnet finnes allerede')
            return
          }
          throw error
        }
        toast.success('Medium opprettet')
      }
      invalidateCache()
      refetch()
      resetForm()
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, navn: string) => {
    if (!confirm(`Slette "${navn}"? Mediehuset fjernes fra listen, men eksisterende tilknytninger beholdes.`)) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('medier') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      refetch()
      toast.success('Medium slettet')
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleToggleAktiv = async (id: string, aktiv: boolean) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('medier') as any).update({ aktiv: !aktiv }).eq('id', id)
      if (error) throw error
      invalidateCache()
      refetch()
      toast.success(aktiv ? 'Medium deaktivert' : 'Medium aktivert')
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const loading = medierLoading || brukereLoading

  if (loading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-theme-secondary">Laster...</div>
      </DashboardLayout>
    )
  }

  const activeCount = medier.filter(m => m.aktiv).length
  const inactiveCount = medier.filter(m => !m.aktiv).length

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme">Mediehus</h1>
            <p className="text-sm text-theme-secondary">
              {activeCount} aktive, {inactiveCount} deaktiverte mediehus
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAdd(true) }}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nytt mediehus
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg className="w-4 h-4 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søk etter mediehus..."
              className="w-full pl-9 pr-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-sm text-theme focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Add/Edit form */}
        {(showAdd || editId) && (
          <div className="mb-6 bg-theme-card rounded-xl border border-cyan-500/30 p-4">
            <h3 className="text-sm font-semibold text-theme mb-3">
              {editId ? 'Rediger mediehus' : 'Nytt mediehus'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-theme-muted mb-1">Navn *</label>
                <input
                  type="text"
                  value={formNavn}
                  onChange={e => setFormNavn(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-sm text-theme focus:outline-none focus:border-cyan-500"
                  placeholder="Mediehus navn"
                />
              </div>
              <div>
                <label className="block text-xs text-theme-muted mb-1">Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-sm text-theme focus:outline-none focus:border-cyan-500"
                >
                  {MEDIUM_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                {editId && (
                  <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formAktiv}
                      onChange={e => setFormAktiv(e.target.checked)}
                      className="rounded border-gray-600"
                    />
                    Aktiv
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Lagrer...' : editId ? 'Lagre endringer' : 'Opprett'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-theme-secondary hover:text-theme text-sm transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-theme-muted mb-3">Viser {filtered.length} av {medier.length} mediehus</p>

        <div className="space-y-3">
          {filtered.map(m => {
            const presseList = getPresseForMedium(m.id)
            const presseCount = presseList.length
            const isExpanded = expandedId === m.id
            return (
              <div key={m.id} className={`bg-theme-card rounded-xl border border-theme overflow-hidden ${!m.aktiv ? 'opacity-50' : ''}`}>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-theme font-medium">{m.navn}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">{typeLabel(m.type)}</span>
                        <span className={`text-xs ${m.aktiv ? 'text-green-400' : 'text-red-400'}`}>{m.aktiv ? 'Aktiv' : 'Deaktivert'}</span>
                        {presseCount > 0 && (
                          <button onClick={() => setExpandedId(isExpanded ? null : m.id)} className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded hover:bg-cyan-500/20 transition-colors touch-manipulation">
                            {presseCount} {presseCount === 1 ? 'bruker' : 'brukere'}
                            <svg className={`w-3 h-3 inline ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => openEdit(m)} className="text-xs text-blue-400 hover:text-blue-300 touch-manipulation">Rediger</button>
                      <button onClick={() => handleToggleAktiv(m.id, m.aktiv)} className={`text-xs touch-manipulation ${m.aktiv ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}>
                        {m.aktiv ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(m.id, m.navn)} className="text-xs text-red-400 hover:text-red-300 touch-manipulation">Slett</button>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && presseCount > 0 && (
                  <div className="px-4 pb-3 border-t border-theme pt-3">
                    <p className="text-xs text-theme-secondary mb-2">Tilknyttede pressebrukere:</p>
                    <div className="space-y-2">
                      {presseList.map(u => (
                        <div key={u.id} className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-white font-bold">{u.fullt_navn.split(' ').map((n: string) => n[0]).join('')}</span>
                          </div>
                          <span className="text-sm text-theme">{u.fullt_navn}</span>
                          <span className="text-xs text-theme-muted">{u.epost}</span>
                          <span className={`text-[10px] ml-auto ${u.aktiv ? 'text-green-400' : 'text-red-400'}`}>
                            {u.aktiv ? 'Aktiv' : 'Deaktivert'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="bg-theme-card rounded-xl border border-theme p-8 text-center text-theme-muted text-sm">
              {search ? 'Ingen mediehus matcher søket' : 'Ingen mediehus registrert'}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}

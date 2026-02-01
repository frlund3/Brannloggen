'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useSentraler, useBrukerprofiler, invalidateCache } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface UserItem {
  id: string
  fullt_navn: string
  epost: string
  rolle: string
  sentral_ids: string[]
  aktiv: boolean
  created_at: string
}

interface UserForm {
  fullt_navn: string
  epost: string
  rolle: string
  sentral_ids: string[]
}

export default function AdminBrukerePage() {
  const { isAdmin, is110Admin, isScoped, scope } = useSentralScope()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { data: dbBrukere, loading: brukereLoading, refetch: refetchBrukere } = useBrukerprofiler()
  const [brukere, setBrukere] = useState<UserItem[]>([])
  const [initialized, setInitialized] = useState(false)

  // Sync DB data into local state once loaded
  if (!brukereLoading && !initialized && dbBrukere.length > 0) {
    setBrukere(dbBrukere.map(b => ({
      id: b.id,
      fullt_navn: b.fullt_navn,
      epost: b.epost || '',
      rolle: b.rolle,
      sentral_ids: b.sentral_ids,
      aktiv: b.aktiv,
      created_at: b.created_at,
    })))
    setInitialized(true)
  }
  const [showAddModal, setShowAddModal] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newUser, setNewUser] = useState<UserForm>({ fullt_navn: '', epost: '', rolle: 'operator', sentral_ids: [] })
  const [editForm, setEditForm] = useState<UserForm>({ fullt_navn: '', epost: '', rolle: '', sentral_ids: [] })
  const [search, setSearch] = useState('')
  const [filterSentral, setFilterSentral] = useState('')
  const [filterRolle, setFilterRolle] = useState('')

  if (sentralerLoading || brukereLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </DashboardLayout>
    )
  }

  // 110-admin can only see users within their sentraler
  const scopedBrukere = isScoped
    ? brukere.filter(u => {
        // 110-admin can see users that share at least one sentral
        if (u.rolle === 'admin') return false // hide full admins from 110-admin
        return u.sentral_ids.some(sId => scope.sentralIds.includes(sId)) || u.sentral_ids.length === 0
      })
    : brukere

  const filtered = scopedBrukere.filter(u => {
    if (search && !u.fullt_navn.toLowerCase().includes(search.toLowerCase()) && !u.epost.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRolle && u.rolle !== filterRolle) return false
    if (filterSentral && !u.sentral_ids.includes(filterSentral)) return false
    return true
  })

  // Available sentraler for filtering and form - scoped for 110-admin
  const availableSentraler = isScoped
    ? sentraler.filter(s => scope.sentralIds.includes(s.id))
    : sentraler

  const handleAdd = () => {
    toast.info('Nye brukere opprettes via invitasjonslenke. Denne funksjonen kommer snart.')
    setShowAddModal(false)
  }

  const handleToggleActive = async (id: string) => {
    const user = brukere.find(u => u.id === id)
    if (!user) return
    const prev = [...brukere]
    setBrukere(brukere.map(u => u.id === id ? { ...u, aktiv: !u.aktiv } : u))
    try {
      const supabase = createClient()
      // @ts-expect-error supabase types not generated
      const { error } = await supabase.from('brukerprofiler').update({ aktiv: !user.aktiv } as any).eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success(user.aktiv ? 'Bruker deaktivert' : 'Bruker aktivert')
    } catch (err) {
      setBrukere(prev)
      toast.error('Kunne ikke endre status: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleEdit = (user: UserItem) => {
    setEditUser(user)
    setEditForm({ fullt_navn: user.fullt_navn, epost: user.epost, rolle: user.rolle, sentral_ids: [...user.sentral_ids] })
  }

  const handleSaveEdit = async () => {
    if (!editUser || !editForm.fullt_navn || !editForm.epost) return
    const prev = [...brukere]
    const updated = {
      fullt_navn: editForm.fullt_navn,
      epost: editForm.epost,
      rolle: editForm.rolle,
      sentral_ids: (editForm.rolle === 'operator' || editForm.rolle === '110-admin') ? editForm.sentral_ids : [],
    }
    setBrukere(brukere.map(u => u.id === editUser.id ? { ...u, ...updated } : u))
    setEditUser(null)
    try {
      const supabase = createClient()
      // @ts-expect-error supabase types not generated
      const { error } = await supabase.from('brukerprofiler').update(updated as any).eq('id', editUser.id)
      if (error) throw error
      invalidateCache()
      toast.success('Bruker oppdatert')
    } catch (err) {
      setBrukere(prev)
      toast.error('Kunne ikke oppdatere bruker: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDelete = async (id: string) => {
    const prev = [...brukere]
    setBrukere(brukere.filter(u => u.id !== id))
    setDeleteConfirm(null)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('brukerprofiler') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('Bruker slettet')
    } catch (err) {
      setBrukere(prev)
      toast.error('Kunne ikke slette bruker: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const toggleSentral = (form: UserForm, setForm: (v: UserForm) => void, sId: string) => {
    setForm({
      ...form,
      sentral_ids: form.sentral_ids.includes(sId)
        ? form.sentral_ids.filter(x => x !== sId)
        : [...form.sentral_ids, sId]
    })
  }

  // Roles that can be assigned - 110-admin can only create operators and 110-admin
  const availableRoles = isAdmin
    ? [
        { value: 'operator', label: 'Operatør' },
        { value: '110-admin', label: '110-sentral Admin' },
        { value: 'presse', label: 'Presse' },
        { value: 'admin', label: 'Administrator' },
      ]
    : [
        { value: 'operator', label: 'Operatør' },
        { value: '110-admin', label: '110-sentral Admin' },
      ]

  const getRolleLabel = (rolle: string) => {
    switch (rolle) {
      case 'admin': return 'Admin'
      case '110-admin': return '110-Admin'
      case 'presse': return 'Presse'
      default: return 'Operatør'
    }
  }

  const getRolleColor = (rolle: string) => {
    switch (rolle) {
      case 'admin': return 'bg-purple-500/20 text-purple-400'
      case '110-admin': return 'bg-orange-500/20 text-orange-400'
      case 'presse': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-blue-500/20 text-blue-400'
    }
  }

  const userFormFields = (values: UserForm, onChange: (v: UserForm) => void) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Fullt navn</label>
        <input type="text" value={values.fullt_navn} onChange={(e) => onChange({ ...values, fullt_navn: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">E-post</label>
        <input type="email" value={values.epost} onChange={(e) => onChange({ ...values, epost: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Rolle</label>
        <select value={values.rolle} onChange={(e) => onChange({ ...values, rolle: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
          {availableRoles.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {(values.rolle === 'operator' || values.rolle === '110-admin') && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">110-sentraler</label>
          <p className="text-xs text-gray-500 mb-2">
            {values.rolle === '110-admin'
              ? 'Velg sentraler som denne admin skal ha tilgang til'
              : 'Velg en eller flere sentraler (inkl. makkersentraler)'}
          </p>
          <div className="max-h-48 overflow-y-auto bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2 space-y-1">
            {availableSentraler.map(s => (
              <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1a] cursor-pointer">
                <input type="checkbox" checked={values.sentral_ids.includes(s.id)} onChange={() => toggleSentral(values, onChange, s.id)} className="rounded border-gray-600" />
                <span className="text-sm text-white">{s.kort_navn}</span>
                <span className="text-xs text-gray-500 ml-auto">{s.navn}</span>
              </label>
            ))}
          </div>
          {values.sentral_ids.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {values.sentral_ids.map(sId => {
                const s = sentraler.find(x => x.id === sId)
                return s ? (
                  <span key={sId} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded flex items-center gap-1">
                    {s.kort_navn}
                    <button type="button" onClick={() => toggleSentral(values, onChange, sId)} className="text-orange-400 hover:text-orange-300">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Brukere</h1>
          <p className="text-sm text-gray-400 mb-3">
            {isScoped ? 'Brukere tilknyttet dine 110-sentraler' : 'Administrer operatører og administratorer'}
          </p>
          <button onClick={() => { setNewUser({ fullt_navn: '', epost: '', rolle: 'operator', sentral_ids: [] }); setShowAddModal(true) }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny bruker
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk på navn eller e-post..." className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64" />
          <select value={filterRolle} onChange={(e) => setFilterRolle(e.target.value)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle roller</option>
            {isAdmin && <option value="admin">Administrator</option>}
            <option value="110-admin">110-sentral Admin</option>
            <option value="operator">Operatør</option>
            {isAdmin && <option value="presse">Presse</option>}
          </select>
          <select value={filterSentral} onChange={(e) => setFilterSentral(e.target.value)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle 110-sentraler</option>
            {availableSentraler.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Totalt', value: scopedBrukere.length, color: 'text-white' },
            ...(isAdmin ? [{ label: 'Administratorer', value: scopedBrukere.filter(u => u.rolle === 'admin').length, color: 'text-purple-400' }] : []),
            { label: '110-admin', value: scopedBrukere.filter(u => u.rolle === '110-admin').length, color: 'text-orange-400' },
            { label: 'Operatører', value: scopedBrukere.filter(u => u.rolle === 'operator').length, color: 'text-blue-400' },
            ...(isAdmin ? [{ label: 'Presse', value: scopedBrukere.filter(u => u.rolle === 'presse').length, color: 'text-cyan-400' }] : []),
            { label: 'Deaktivert', value: scopedBrukere.filter(u => !u.aktiv).length, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Bruker</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">E-post</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Rolle</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden sm:table-cell">110-sentral</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const userSentraler = user.sentral_ids.map(sId => sentraler.find(s => s.id === sId)).filter(Boolean)
                  // 110-admin cannot edit other admins or 110-admins
                  const canEdit = isAdmin || (is110Admin && user.rolle !== 'admin' && user.rolle !== '110-admin')
                  const canDelete = isAdmin
                  return (
                    <tr key={user.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs text-white font-bold">{user.fullt_navn.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                          <span className="text-sm text-white font-medium">{user.fullt_navn}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell"><span className="text-sm text-gray-400">{user.epost}</span></td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${getRolleColor(user.rolle)}`}>
                          {getRolleLabel(user.rolle)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {userSentraler.length > 0 ? userSentraler.map(s => (
                            <span key={s!.id} className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">{s!.kort_navn}</span>
                          )) : <span className="text-xs text-gray-600">-</span>}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs ${user.aktiv ? 'text-green-400' : 'text-red-400'}`}>{user.aktiv ? 'Aktiv' : 'Deaktivert'}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-3">
                          {canEdit && <button onClick={() => handleEdit(user)} className="text-xs text-blue-400 hover:text-blue-300 py-1 touch-manipulation">Rediger</button>}
                          <button onClick={() => handleToggleActive(user.id)} className={`text-xs py-1 touch-manipulation ${user.aktiv ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}>
                            {user.aktiv ? 'Deaktiver' : 'Aktiver'}
                          </button>
                          {canDelete && <button onClick={() => setDeleteConfirm(user.id)} className="text-xs text-red-400 hover:text-red-300 py-1 touch-manipulation">Slett</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#2a2a2a]">
            <p className="text-xs text-gray-500">Viser {filtered.length} av {scopedBrukere.length} brukere</p>
          </div>
        </div>

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Ny bruker</h2>
              {userFormFields(newUser, setNewUser)}
              <div className="flex gap-3 mt-6">
                <button onClick={handleAdd} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Opprett bruker</button>
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditUser(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-white mb-4">Rediger bruker</h2>
              {userFormFields(editForm, setEditForm)}
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">Lagre endringer</button>
                <button onClick={() => setEditUser(null)} className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Avbryt</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-white mb-2">Slett bruker?</h2>
              <p className="text-sm text-gray-400 mb-6">Er du sikker på at du vil slette {brukere.find(u => u.id === deleteConfirm)?.fullt_navn}?</p>
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

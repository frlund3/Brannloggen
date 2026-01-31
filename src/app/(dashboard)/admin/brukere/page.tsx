'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { brannvesen } from '@/data/brannvesen'
import { sentraler } from '@/data/sentraler'
import { useState } from 'react'

interface UserItem {
  id: string
  fullt_navn: string
  epost: string
  rolle: string
  brannvesen_id: string | null
  aktiv: boolean
  created_at: string
}

const initialBrukere: UserItem[] = [
  { id: '1', fullt_navn: 'Frank Lunde', epost: 'frank.lunde1981@gmail.com', rolle: 'admin', brannvesen_id: null, aktiv: true, created_at: '2024-01-15' },
  { id: '2', fullt_navn: 'Helge Lunde', epost: 'helge.lunde1981@gmail.com', rolle: 'admin', brannvesen_id: null, aktiv: true, created_at: '2024-01-15' },
  { id: '3', fullt_navn: 'Kari Operatør', epost: 'kari@bergen-brann.no', rolle: 'operator', brannvesen_id: 'bv-bergen', aktiv: true, created_at: '2024-02-01' },
  { id: '4', fullt_navn: 'Ole Vansen', epost: 'ole@oslo-brann.no', rolle: 'operator', brannvesen_id: 'bv-oslo', aktiv: true, created_at: '2024-02-15' },
  { id: '5', fullt_navn: 'Per Hansen', epost: 'per@tbrt.no', rolle: 'operator', brannvesen_id: 'bv-trondheim', aktiv: true, created_at: '2024-03-01' },
  { id: '6', fullt_navn: 'Anna Journalist', epost: 'anna@nrk.no', rolle: 'presse', brannvesen_id: null, aktiv: true, created_at: '2024-04-01' },
  { id: '7', fullt_navn: 'Erik Redaktør', epost: 'erik@vg.no', rolle: 'presse', brannvesen_id: null, aktiv: true, created_at: '2024-04-10' },
  { id: '8', fullt_navn: 'Lisa Eriksen', epost: 'lisa@kbr.no', rolle: 'operator', brannvesen_id: 'bv-kristiansand', aktiv: false, created_at: '2024-03-15' },
]

export default function AdminBrukerePage() {
  const [brukere, setBrukere] = useState<UserItem[]>(initialBrukere)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({ fullt_navn: '', epost: '', rolle: 'operator', brannvesen_id: '' })
  const [editForm, setEditForm] = useState({ fullt_navn: '', epost: '', rolle: '', brannvesen_id: '' })
  const [search, setSearch] = useState('')
  const [filterSentral, setFilterSentral] = useState('')
  const [filterRolle, setFilterRolle] = useState('')

  const filtered = brukere.filter(u => {
    if (search && !u.fullt_navn.toLowerCase().includes(search.toLowerCase()) && !u.epost.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRolle && u.rolle !== filterRolle) return false
    if (filterSentral) {
      const sentral = sentraler.find(s => s.id === filterSentral)
      if (sentral && (!u.brannvesen_id || !sentral.brannvesen_ids.includes(u.brannvesen_id))) return false
    }
    return true
  })

  const handleAdd = () => {
    if (!newUser.fullt_navn || !newUser.epost) return
    const user: UserItem = {
      id: String(Date.now()),
      fullt_navn: newUser.fullt_navn,
      epost: newUser.epost,
      rolle: newUser.rolle,
      brannvesen_id: newUser.rolle === 'operator' ? newUser.brannvesen_id || null : null,
      aktiv: true,
      created_at: new Date().toISOString().split('T')[0],
    }
    setBrukere([...brukere, user])
    setNewUser({ fullt_navn: '', epost: '', rolle: 'operator', brannvesen_id: '' })
    setShowAddModal(false)
  }

  const handleToggleActive = (id: string) => {
    setBrukere(brukere.map(u => u.id === id ? { ...u, aktiv: !u.aktiv } : u))
  }

  const handleEdit = (user: UserItem) => {
    setEditUser(user)
    setEditForm({ fullt_navn: user.fullt_navn, epost: user.epost, rolle: user.rolle, brannvesen_id: user.brannvesen_id || '' })
  }

  const handleSaveEdit = () => {
    if (!editUser || !editForm.fullt_navn || !editForm.epost) return
    setBrukere(brukere.map(u => u.id === editUser.id ? {
      ...u, fullt_navn: editForm.fullt_navn, epost: editForm.epost, rolle: editForm.rolle,
      brannvesen_id: editForm.rolle === 'operator' ? editForm.brannvesen_id || null : null,
    } : u))
    setEditUser(null)
  }

  const handleDelete = (id: string) => {
    setBrukere(brukere.filter(u => u.id !== id))
    setDeleteConfirm(null)
  }

  const userFormFields = (values: typeof newUser, onChange: (v: typeof newUser) => void) => (
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
          <option value="operator">Operatør</option>
          <option value="presse">Presse</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      {values.rolle === 'operator' && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Brannvesen</label>
          <select value={values.brannvesen_id} onChange={(e) => onChange({ ...values, brannvesen_id: e.target.value })} className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Velg brannvesen</option>
            {brannvesen.map((b) => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
          </select>
        </div>
      )}
    </div>
  )

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Brukere</h1>
            <p className="text-sm text-gray-400">Administrer operatører og administratorer</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny bruker
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk på navn eller e-post..." className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 w-64" />
          <select value={filterRolle} onChange={(e) => setFilterRolle(e.target.value)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle roller</option>
            <option value="admin">Administrator</option>
            <option value="operator">Operatør</option>
            <option value="presse">Presse</option>
          </select>
          <select value={filterSentral} onChange={(e) => setFilterSentral(e.target.value)} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Alle 110-sentraler</option>
            {sentraler.map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Totalt', value: brukere.length, color: 'text-white' },
            { label: 'Administratorer', value: brukere.filter(u => u.rolle === 'admin').length, color: 'text-purple-400' },
            { label: 'Operatører', value: brukere.filter(u => u.rolle === 'operator').length, color: 'text-blue-400' },
            { label: 'Presse', value: brukere.filter(u => u.rolle === 'presse').length, color: 'text-cyan-400' },
            { label: 'Deaktivert', value: brukere.filter(u => !u.aktiv).length, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Bruker</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">E-post</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Rolle</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Brannvesen</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">110-sentral</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const bv = brannvesen.find((b) => b.id === user.brannvesen_id)
                const sentral = user.brannvesen_id ? sentraler.find(s => s.brannvesen_ids.includes(user.brannvesen_id!)) : null
                return (
                  <tr key={user.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{user.fullt_navn.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <span className="text-sm text-white font-medium">{user.fullt_navn}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-gray-400">{user.epost}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${user.rolle === 'admin' ? 'bg-purple-500/20 text-purple-400' : user.rolle === 'presse' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {user.rolle === 'admin' ? 'Admin' : user.rolle === 'presse' ? 'Presse' : 'Operatør'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-gray-400">{bv?.kort_navn || '-'}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs ${sentral ? 'text-orange-400' : 'text-gray-600'}`}>{sentral?.kort_navn || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${user.aktiv ? 'text-green-400' : 'text-red-400'}`}>{user.aktiv ? 'Aktiv' : 'Deaktivert'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(user)} className="text-xs text-blue-400 hover:text-blue-300">Rediger</button>
                        <button onClick={() => handleToggleActive(user.id)} className={`text-xs ${user.aktiv ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}>
                          {user.aktiv ? 'Deaktiver' : 'Aktiver'}
                        </button>
                        <button onClick={() => setDeleteConfirm(user.id)} className="text-xs text-red-400 hover:text-red-300">Slett</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-[#2a2a2a]">
            <p className="text-xs text-gray-500">Viser {filtered.length} av {brukere.length} brukere</p>
          </div>
        </div>

        {/* Add modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4">
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
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4">
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

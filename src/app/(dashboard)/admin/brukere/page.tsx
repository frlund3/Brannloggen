'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { brannvesen } from '@/data/brannvesen'
import { useState } from 'react'

interface MockUser {
  id: string
  fullt_navn: string
  epost: string
  rolle: string
  brannvesen_id: string | null
  aktiv: boolean
  created_at: string
}

const mockBrukere: MockUser[] = [
  { id: '1', fullt_navn: 'Frank Lunde', epost: 'frank.lunde1981@gmail.com', rolle: 'admin', brannvesen_id: null, aktiv: true, created_at: '2024-01-15' },
  { id: '2', fullt_navn: 'Kari Operatør', epost: 'kari@bergen-brann.no', rolle: 'operator', brannvesen_id: 'bv-bergen', aktiv: true, created_at: '2024-02-01' },
  { id: '3', fullt_navn: 'Ole Vansen', epost: 'ole@oslo-brann.no', rolle: 'operator', brannvesen_id: 'bv-oslo', aktiv: true, created_at: '2024-02-15' },
  { id: '4', fullt_navn: 'Per Hansen', epost: 'per@tbrt.no', rolle: 'operator', brannvesen_id: 'bv-trondheim', aktiv: true, created_at: '2024-03-01' },
  { id: '5', fullt_navn: 'Lisa Eriksen', epost: 'lisa@kbr.no', rolle: 'operator', brannvesen_id: 'bv-kristiansand', aktiv: false, created_at: '2024-03-15' },
]

export default function AdminBrukerePage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ fullt_navn: '', epost: '', rolle: 'operator', brannvesen_id: '' })

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Brukere</h1>
            <p className="text-sm text-gray-400">Administrer operatører og administratorer</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ny bruker
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Totalt', value: mockBrukere.length, color: 'text-white' },
            { label: 'Administratorer', value: mockBrukere.filter(u => u.rolle === 'admin').length, color: 'text-purple-400' },
            { label: 'Operatører', value: mockBrukere.filter(u => u.rolle === 'operator').length, color: 'text-blue-400' },
            { label: 'Deaktivert', value: mockBrukere.filter(u => !u.aktiv).length, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Bruker</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">E-post</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Rolle</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Brannvesen</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {mockBrukere.map((user) => {
                const bv = brannvesen.find((b) => b.id === user.brannvesen_id)
                return (
                  <tr key={user.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">
                            {user.fullt_navn.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm text-white font-medium">{user.fullt_navn}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-400">{user.epost}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.rolle === 'admin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.rolle === 'admin' ? 'Admin' : 'Operatør'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-400">{bv?.kort_navn || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${user.aktiv ? 'text-green-400' : 'text-red-400'}`}>
                        {user.aktiv ? 'Aktiv' : 'Deaktivert'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-blue-400 hover:text-blue-300 mr-3">Rediger</button>
                      <button className="text-xs text-red-400 hover:text-red-300">
                        {user.aktiv ? 'Deaktiver' : 'Aktiver'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Add user modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-bold text-white mb-4">Ny bruker</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fullt navn</label>
                  <input
                    type="text"
                    value={newUser.fullt_navn}
                    onChange={(e) => setNewUser({ ...newUser, fullt_navn: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-post</label>
                  <input
                    type="email"
                    value={newUser.epost}
                    onChange={(e) => setNewUser({ ...newUser, epost: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Rolle</label>
                  <select
                    value={newUser.rolle}
                    onChange={(e) => setNewUser({ ...newUser, rolle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="operator">Operatør</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                {newUser.rolle === 'operator' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Brannvesen</label>
                    <select
                      value={newUser.brannvesen_id}
                      onChange={(e) => setNewUser({ ...newUser, brannvesen_id: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Velg brannvesen</option>
                      {brannvesen.map((b) => (
                        <option key={b.id} value={b.id}>{b.kort_navn}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { alert('Bruker opprettet (demo)'); setShowAddModal(false) }}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Opprett bruker
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

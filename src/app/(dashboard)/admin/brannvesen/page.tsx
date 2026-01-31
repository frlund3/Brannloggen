'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { brannvesen } from '@/data/brannvesen'
import { fylker } from '@/data/fylker'
import { kommuner } from '@/data/kommuner'
import { useState } from 'react'

export default function AdminBrannvesenPage() {
  const [search, setSearch] = useState('')
  const [selectedFylke, setSelectedFylke] = useState('')

  const filtered = brannvesen
    .filter((b) => {
      if (selectedFylke && b.fylke_id !== selectedFylke) return false
      if (search && !b.navn.toLowerCase().includes(search.toLowerCase()) && !b.kort_navn.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => a.navn.localeCompare(b.navn, 'no'))

  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Brannvesen</h1>
            <p className="text-sm text-gray-400">{brannvesen.length} brannvesen registrert</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk etter brannvesen..."
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 w-64"
          />
          <select
            value={selectedFylke}
            onChange={(e) => setSelectedFylke(e.target.value)}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Alle fylker</option>
            {fylker.map((f) => (
              <option key={f.id} value={f.id}>{f.navn}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {fylker.slice(0, 4).map((f) => (
            <div key={f.id} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">{f.navn}</p>
              <p className="text-xl font-bold text-white">
                {brannvesen.filter((b) => b.fylke_id === f.id).length}
              </p>
              <p className="text-xs text-gray-500">brannvesen</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Brannvesen</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Kort navn</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Fylke</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Kommuner</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const fylke = fylker.find((f) => f.id === b.fylke_id)
                  const bKommuner = b.kommune_ids
                    .map((kid) => kommuner.find((k) => k.id === kid))
                    .filter(Boolean)
                  return (
                    <tr key={b.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                      <td className="px-4 py-3">
                        <span className="text-sm text-white font-medium">{b.navn}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-400">{b.kort_navn}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-400">{fylke?.navn}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {bKommuner.slice(0, 3).map((k) => (
                            <span key={k!.id} className="text-xs bg-[#0a0a0a] px-1.5 py-0.5 rounded text-gray-400">
                              {k!.navn}
                            </span>
                          ))}
                          {bKommuner.length > 3 && (
                            <span className="text-xs text-gray-500">+{bKommuner.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-blue-400 hover:text-blue-300">Rediger</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#2a2a2a]">
            <p className="text-xs text-gray-500">Viser {filtered.length} av {brannvesen.length} brannvesen</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

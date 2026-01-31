'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { mockHendelser } from '@/data/mock-hendelser'
import { brannvesen } from '@/data/brannvesen'
import { kategorier } from '@/data/kategorier'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

export default function OperatorHendelserPage() {
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  // In production, filter by operator's brannvesen_id
  const hendelser = mockHendelser
    .filter((h) => statusFilter === 'alle' || h.status === statusFilter)
    .sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())

  return (
    <DashboardLayout role="operator">
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Hendelser</h1>
            <p className="text-sm text-gray-400">Administrer hendelser for ditt brannvesen</p>
          </div>
          <Link
            href="/operator/hendelser/ny"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ny hendelse
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'alle', label: 'Alle' },
            { value: 'pågår', label: 'Pågår' },
            { value: 'avsluttet', label: 'Avsluttet' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs">
                ({tab.value === 'alle'
                  ? mockHendelser.length
                  : mockHendelser.filter((h) => h.status === tab.value).length})
              </span>
            </button>
          ))}
        </div>

        {/* Hendelser table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tittel</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Brannvesen</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Alvor</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Opprettet</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Oppdateringer</th>
                </tr>
              </thead>
              <tbody>
                {hendelser.map((h) => {
                  const bv = brannvesen.find((b) => b.id === h.brannvesen_id)
                  const kat = kategorier.find((k) => k.id === h.kategori_id)
                  return (
                    <tr
                      key={h.id}
                      className="border-b border-[#2a2a2a] hover:bg-[#222] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <StatusBadge status={h.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/operator/hendelser/${h.id}`} className="text-sm text-white hover:text-blue-400 font-medium">
                          {h.tittel}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{h.sted}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {kat && (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: kat.farge + '22', color: kat.farge }}
                          >
                            {kat.navn}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-400">{bv?.kort_navn}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <SeverityDot severity={h.alvorlighetsgrad} showLabel />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">{formatDateTime(h.opprettet_tidspunkt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">{h.oppdateringer.length}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

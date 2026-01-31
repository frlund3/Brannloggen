'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { formatTime, formatTimeAgo } from '@/lib/utils'
import { brannvesen } from '@/data/brannvesen'
import { kategorier } from '@/data/kategorier'
import { useState } from 'react'

interface IncidentUpdate {
  id: string
  tekst: string
  opprettet_tidspunkt: string
}

interface IncidentCardProps {
  id: string
  brannvesen_id: string
  kategori_id: string
  tittel: string
  beskrivelse: string
  sted: string
  status: string
  alvorlighetsgrad: string
  opprettet_tidspunkt: string
  oppdatert_tidspunkt: string
  oppdateringer?: IncidentUpdate[]
  onClick?: () => void
}

export function IncidentCard({
  brannvesen_id,
  kategori_id,
  tittel,
  beskrivelse,
  status,
  alvorlighetsgrad,
  opprettet_tidspunkt,
  oppdateringer = [],
  onClick,
}: IncidentCardProps) {
  const [showUpdates, setShowUpdates] = useState(false)

  const bv = brannvesen.find((b) => b.id === brannvesen_id)
  const kat = kategorier.find((k) => k.id === kategori_id)

  return (
    <div
      className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-4 hover:bg-[#222] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-gray-400">{bv?.kort_navn || bv?.navn}</span>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>

      <h3 className="text-base font-bold text-white mb-0.5 leading-tight">{tittel}</h3>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-300">{formatTime(opprettet_tidspunkt)}</span>
        {kat && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: kat.farge + '22', color: kat.farge }}
          >
            {kat.navn}
          </span>
        )}
        <SeverityDot severity={alvorlighetsgrad} showLabel />
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">{beskrivelse}</p>

      {oppdateringer.length > 0 && (
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowUpdates(!showUpdates)
            }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {oppdateringer.length} oppdatering{oppdateringer.length > 1 ? 'er' : ''},
            siste {formatTimeAgo(oppdateringer[oppdateringer.length - 1].opprettet_tidspunkt)}
            <svg
              className={`w-3 h-3 transition-transform ${showUpdates ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUpdates && (
            <div className="mt-2 space-y-2 border-l-2 border-blue-500/30 pl-3">
              {oppdateringer.map((update) => (
                <div key={update.id}>
                  <span className="text-xs text-gray-500">{formatTime(update.opprettet_tidspunkt)}</span>
                  <p className="text-sm text-gray-300">{update.tekst}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

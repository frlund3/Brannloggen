'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { formatTime, formatTimeAgo } from '@/lib/utils'
import { useBrannvesen, useKategorier, useSentraler } from '@/hooks/useSupabaseData'
import { useState } from 'react'

interface IncidentUpdate {
  id: string
  tekst: string
  opprettet_av: string
  opprettet_tidspunkt: string
  bilde_url?: string | null
  deaktivert?: boolean
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
  opprettet_av: string
  opprettet_tidspunkt: string
  oppdatert_tidspunkt: string
  presse_tekst?: string | null
  bilde_url?: string | null
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
  opprettet_av,
  opprettet_tidspunkt,
  oppdatert_tidspunkt,
  bilde_url,
  oppdateringer = [],
  onClick,
}: IncidentCardProps) {
  const [showUpdates, setShowUpdates] = useState(false)
  const { data: brannvesen } = useBrannvesen()
  const { data: sentraler } = useSentraler()
  const { data: kategorier } = useKategorier()
  const bv = brannvesen.find((b) => b.id === brannvesen_id)
  const sentral = sentraler.find((s) => s.brannvesen_ids.includes(brannvesen_id))
  const kat = kategorier.find((k) => k.id === kategori_id)

  const activeUpdates = oppdateringer.filter(u => !u.deaktivert)
  const stripeColor = status === 'pågår' ? 'bg-red-500' : 'bg-gray-600'

  return (
    <div
      className="rounded-xl bg-theme-card border border-theme hover:bg-theme-card-hover transition-colors cursor-pointer flex overflow-hidden"
      onClick={onClick}
    >
      {/* Status color stripe */}
      <div className={`w-1 shrink-0 ${stripeColor}`} />
      <div className="p-4 flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-theme-secondary">{sentral?.kort_navn || bv?.kort_navn || bv?.navn}</span>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>

      <h3 className="text-base font-bold text-theme mb-0.5 leading-tight">{tittel}</h3>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-300">{formatTime(opprettet_tidspunkt)}</span>
        {kat && (
          <span
            className="text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            style={{ backgroundColor: kat.farge + '22', color: kat.farge }}
          >
            <CategoryIcon iconName={kat.ikon} className="w-3 h-3" />
            {kat.navn}
          </span>
        )}
        <SeverityDot severity={alvorlighetsgrad} showLabel />
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">{beskrivelse}</p>

      {/* Hendelsebilde */}
      {bilde_url && (
        <img src={bilde_url} alt="" className="mt-2 rounded-lg max-h-32 max-w-[200px] object-cover" />
      )}

      {/* Last edited indicator */}
      {oppdatert_tidspunkt && (() => {
        const created = new Date(opprettet_tidspunkt).getTime()
        const updated = new Date(oppdatert_tidspunkt).getTime()
        const lastUpdate = activeUpdates.length > 0
          ? new Date(activeUpdates[activeUpdates.length - 1].opprettet_tidspunkt).getTime()
          : 0
        const latestChange = Math.max(updated, lastUpdate)
        if (latestChange - created > 60_000) {
          return (
            <p className="text-xs text-theme-muted mt-2">
              Sist redigert {formatTimeAgo(new Date(latestChange).toISOString())}
            </p>
          )
        }
        return null
      })()}

      {activeUpdates.length > 0 && (
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowUpdates(!showUpdates)
            }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {activeUpdates.length} oppdatering{activeUpdates.length > 1 ? 'er' : ''},
            siste {formatTimeAgo(activeUpdates[activeUpdates.length - 1].opprettet_tidspunkt)}
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
            <div className="mt-3 relative ml-1">
              {activeUpdates.map((update, i) => (
                <div key={update.id} className="relative pl-5 pb-4 last:pb-0">
                  {/* Vertical line connecting nodes */}
                  {i < activeUpdates.length - 1 && (
                    <div className="absolute left-[5px] top-[10px] bottom-0 w-px bg-blue-500/30" />
                  )}
                  {/* Timeline node */}
                  <div className="absolute left-0 top-[6px] w-[11px] h-[11px] rounded-full border-2 border-blue-500 bg-theme-card" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-theme-muted font-medium">{formatTime(update.opprettet_tidspunkt)}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-0.5">{update.tekst}</p>
                  {update.bilde_url && (
                    <img src={update.bilde_url} alt="" className="mt-1.5 rounded-lg max-h-48 object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

'use client'

import { cn, getSeverityColor } from '@/lib/utils'

interface SeverityDotProps {
  severity: string
  showLabel?: boolean
}

const labels: Record<string, string> = {
  kritisk: 'Kritisk',
  høy: 'Høy',
  middels: 'Middels',
  lav: 'Lav',
}

export function SeverityDot({ severity, showLabel = false }: SeverityDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', getSeverityColor(severity))} />
      {showLabel && (
        <span className="text-xs text-gray-400">{labels[severity] || severity}</span>
      )}
    </span>
  )
}

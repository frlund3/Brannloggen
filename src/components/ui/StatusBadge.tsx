'use client'

import { cn, getStatusColor } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const label = status === 'pågår' ? 'Pågår' : 'Avsluttet'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-medium',
        getStatusColor(status),
        status === 'pågår' && 'status-pågår',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'
      )}
    >
      {label}
    </span>
  )
}

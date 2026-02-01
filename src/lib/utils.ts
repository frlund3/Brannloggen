export function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'Nå'
  if (diffMinutes < 60) return `${diffMinutes} min siden`
  if (diffHours < 24) return `${diffHours} t siden`
  if (diffDays < 7) return `${diffDays} d siden`

  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined,
  })
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('nb-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'kritisk': return 'bg-red-600'
    case 'høy': return 'bg-orange-500'
    case 'middels': return 'bg-yellow-500'
    case 'lav': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pågår': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
    case 'avsluttet': return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30'
    default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30'
  }
}

export function formatDuration(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const diffMs = end.getTime() - start.getTime()
  if (diffMs < 0) return '-'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const restMin = minutes % 60
  if (hours < 24) return `${hours}t ${restMin}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}t`
}

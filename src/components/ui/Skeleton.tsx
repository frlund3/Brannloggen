'use client'

export function IncidentCardSkeleton() {
  return (
    <div className="rounded-xl bg-theme-card border border-theme flex overflow-hidden animate-pulse">
      <div className="w-7 shrink-0 bg-gray-600" />
      <div className="p-4 flex-1 min-w-0 space-y-3">
        <div className="h-3 bg-theme-card-hover rounded w-24" />
        <div className="h-5 bg-theme-card-hover rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-theme-card-hover rounded w-12" />
          <div className="h-3 bg-theme-card-hover rounded w-20" />
          <div className="h-3 bg-theme-card-hover rounded w-8" />
        </div>
        <div className="h-4 bg-theme-card-hover rounded w-full" />
        <div className="h-4 bg-theme-card-hover rounded w-2/3" />
      </div>
    </div>
  )
}

export function IncidentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <IncidentCardSkeleton key={i} />
      ))}
    </div>
  )
}

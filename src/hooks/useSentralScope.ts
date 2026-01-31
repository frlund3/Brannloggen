import { useMemo } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { sentraler } from '@/data/sentraler'
import { brannvesen } from '@/data/brannvesen'
import { kommuner } from '@/data/kommuner'

/**
 * Hook that derives the scope for a 110-admin user.
 * For 'admin' role, returns isAdmin=true and empty scope (full access).
 * For '110-admin' role, returns the allowed sentraler, brannvesen, fylker, kommuner
 * based on user's sentral_ids.
 */
export function useSentralScope() {
  const { rolle, sentralIds } = useAuth()

  const isAdmin = rolle === 'admin'
  const is110Admin = rolle === '110-admin'
  const isScoped = is110Admin && sentralIds.length > 0

  const scope = useMemo(() => {
    if (!isScoped) {
      return {
        sentralIds: [] as string[],
        fylkeIds: [] as string[],
        brannvesenIds: [] as string[],
        kommuneIds: [] as string[],
      }
    }

    const userSentraler = sentraler.filter(s => sentralIds.includes(s.id))
    const fylkeIds = [...new Set(userSentraler.flatMap(s => s.fylke_ids))]
    const brannvesenIds = [...new Set(userSentraler.flatMap(s => s.brannvesen_ids))]
    const kommuneIds = brannvesen
      .filter(b => brannvesenIds.includes(b.id))
      .flatMap(b => b.kommune_ids)
    const uniqueKommuneIds = [...new Set(kommuneIds)]

    return {
      sentralIds,
      fylkeIds,
      brannvesenIds,
      kommuneIds: uniqueKommuneIds,
    }
  }, [isScoped, sentralIds])

  return {
    isAdmin,
    is110Admin,
    isScoped,
    hasAdminAccess: isAdmin || is110Admin,
    scope,
    /** Filter an array of items that have a brannvesen_id field */
    filterByBrannvesen: <T extends { brannvesen_id: string }>(items: T[]): T[] => {
      if (isAdmin || !isScoped) return items
      return items.filter(item => scope.brannvesenIds.includes(item.brannvesen_id))
    },
    /** Filter brannvesen list to only those in scope */
    filterBrannvesen: <T extends { id: string }>(items: T[]): T[] => {
      if (isAdmin || !isScoped) return items
      return items.filter(item => scope.brannvesenIds.includes(item.id))
    },
    /** Filter fylker list to only those in scope */
    filterFylker: <T extends { id: string }>(items: T[]): T[] => {
      if (isAdmin || !isScoped) return items
      return items.filter(item => scope.fylkeIds.includes(item.id))
    },
    /** Filter kommuner list to only those in scope */
    filterKommuner: <T extends { id: string }>(items: T[]): T[] => {
      if (isAdmin || !isScoped) return items
      return items.filter(item => scope.kommuneIds.includes(item.id))
    },
    /** Filter sentraler list to only user's sentraler */
    filterSentraler: <T extends { id: string }>(items: T[]): T[] => {
      if (isAdmin || !isScoped) return items
      return items.filter(item => sentralIds.includes(item.id))
    },
  }
}

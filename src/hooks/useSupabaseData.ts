'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Types matching the database schema
export interface Fylke {
  id: string
  navn: string
  nummer: string
}

export interface Kommune {
  id: string
  navn: string
  nummer: string
  fylke_id: string
}

export interface Brannvesen {
  id: string
  navn: string
  kort_navn: string
  fylke_id: string
  kommune_ids: string[]
  aktiv: boolean
}

export interface Kategori {
  id: string
  navn: string
  ikon: string
  farge: string
  beskrivelse: string | null
}

export interface Sentral {
  id: string
  navn: string
  kort_navn: string
  fylke_ids: string[]
  brannvesen_ids: string[]
}

export interface Hendelse {
  id: string
  brannvesen_id: string
  kommune_id: string
  fylke_id: string
  kategori_id: string
  tittel: string
  beskrivelse: string
  sted: string
  status: string
  alvorlighetsgrad: string
  opprettet_av: string
  opprettet_tidspunkt: string
  oppdatert_tidspunkt: string
  avsluttet_tidspunkt: string | null
  latitude: number | null
  longitude: number | null
  presse_tekst: string | null
  oppdateringer?: HendelseOppdatering[]
}

export interface HendelseOppdatering {
  id: string
  hendelse_id: string
  tekst: string
  opprettet_tidspunkt: string
}

export interface Brukerprofil {
  id: string
  user_id: string
  rolle: string
  fullt_navn: string
  epost: string | null
  sentral_ids: string[]
  aktiv: boolean
  created_at: string
}

// Simple in-memory cache
const cache: Record<string, { data: unknown; timestamp: number }> = {}
const CACHE_TTL = 60_000 // 1 minute

function getCached<T>(key: string): T | null {
  const entry = cache[key]
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T
  }
  return null
}

function setCache(key: string, data: unknown) {
  cache[key] = { data, timestamp: Date.now() }
}

export function invalidateCache(key?: string) {
  if (key) {
    delete cache[key]
  } else {
    Object.keys(cache).forEach(k => delete cache[k])
  }
}

// Generic fetcher hook
function useSupabaseFetch<T>(table: string, options?: {
  select?: string
  order?: string
  filter?: { column: string; value: string }
  enabled?: boolean
}) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const enabled = options?.enabled ?? true
    if (!enabled) {
      setLoading(false)
      return
    }

    const cacheKey = `${table}:${JSON.stringify(options)}`
    const cached = getCached<T[]>(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      let query = supabase.from(table).select(options?.select || '*')

      if (options?.filter) {
        query = query.eq(options.filter.column, options.filter.value)
      }
      if (options?.order) {
        query = query.order(options.order)
      }

      const { data: result, error: err } = await query
      if (err) {
        setError(err.message)
      } else {
        setData((result || []) as T[])
        setCache(cacheKey, result || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }, [table, options?.select, options?.order, options?.filter?.column, options?.filter?.value, options?.enabled])

  const refetch = useCallback(() => {
    const cacheKey = `${table}:${JSON.stringify(options)}`
    delete cache[cacheKey]
    setLoading(true)
    fetchData()
  }, [fetchData, table, options])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

// Specific hooks for each table
export function useFylker() {
  return useSupabaseFetch<Fylke>('fylker', { order: 'navn' })
}

export function useKommuner() {
  return useSupabaseFetch<Kommune>('kommuner', { order: 'navn' })
}

export function useBrannvesen() {
  return useSupabaseFetch<Brannvesen>('brannvesen', { order: 'kort_navn' })
}

export function useKategorier() {
  return useSupabaseFetch<Kategori>('kategorier', { order: 'navn' })
}

export function useSentraler() {
  return useSupabaseFetch<Sentral>('sentraler', { order: 'navn' })
}

export function useHendelser(options?: { excludeDeactivated?: boolean }) {
  const [hendelser, setHendelser] = useState<Hendelse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const cacheKey = `hendelser:${JSON.stringify(options)}`
    const cached = getCached<Hendelse[]>(cacheKey)
    if (cached) {
      setHendelser(cached)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      let query = supabase
        .from('hendelser')
        .select('*, hendelsesoppdateringer(*)')
        .order('opprettet_tidspunkt', { ascending: false })

      if (options?.excludeDeactivated) {
        query = query.neq('status', 'deaktivert')
      }

      const { data, error: err } = await query
      if (err) {
        setError(err.message)
      } else {
        // Map oppdateringer from the join
        const mapped = (data || []).map((h: Record<string, unknown>) => ({
          ...h,
          oppdateringer: ((h.hendelsesoppdateringer || []) as HendelseOppdatering[]).sort(
            (a: HendelseOppdatering, b: HendelseOppdatering) =>
              new Date(a.opprettet_tidspunkt).getTime() - new Date(b.opprettet_tidspunkt).getTime()
          ),
        })) as Hendelse[]
        setHendelser(mapped)
        setCache(cacheKey, mapped)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }, [options?.excludeDeactivated])

  const refetch = useCallback(() => {
    invalidateCache('hendelser')
    setLoading(true)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data: hendelser, loading, error, refetch }
}

export function useBrukerprofiler() {
  return useSupabaseFetch<Brukerprofil>('brukerprofiler', {
    select: 'id, user_id, rolle, fullt_navn, epost, sentral_ids, aktiv, created_at',
    order: 'fullt_navn',
  })
}

export interface PushAbonnent {
  id: string
  device_id: string
  platform: string
  push_token: string
  push_aktiv: boolean
  sentral_ids: string[]
  fylke_ids: string[]
  kategori_ids: string[]
  kun_pågående: boolean
  registrert: string
  sist_aktiv: string
}

export function usePushAbonnenter() {
  return useSupabaseFetch<PushAbonnent>('push_abonnenter', { order: 'sist_aktiv' })
}

/**
 * Typed query helpers for Supabase tables.
 *
 * Since this project does not use generated Supabase database types
 * (via `supabase gen types typescript`), the client's `.from()` method
 * returns untyped query builders. This module provides a single typed
 * wrapper so that `as any` assertions are centralized here instead of
 * scattered across every file that writes to the database.
 *
 * When generated types are added in the future, this module can be
 * removed and the client can be typed directly.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type TableName =
  | 'hendelser'
  | 'hendelsesoppdateringer'
  | 'presseoppdateringer'
  | 'interne_notater'
  | 'push_abonnenter'
  | 'presse_soknader'
  | 'brukerprofiler'
  | 'aktivitetslogg'

/**
 * Returns an untyped query builder for the given table.
 * Centralises the single unavoidable `as any` so consuming code
 * stays free of explicit any-casts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function from(supabase: SupabaseClient, table: TableName): any {
  return supabase.from(table)
}

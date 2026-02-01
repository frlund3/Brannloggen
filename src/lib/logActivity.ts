import { createClient } from '@/lib/supabase/client'

export type AktivitetsHandling =
  | 'opprettet'
  | 'redigert'
  | 'deaktivert'
  | 'avsluttet'
  | 'gjenåpnet'
  | 'bilde_lastet_opp'
  | 'bilde_fjernet'
  | 'ny_oppdatering'
  | 'redigert_oppdatering'
  | 'deaktivert_oppdatering'
  | 'ny_pressemelding'
  | 'redigert_pressemelding'
  | 'deaktivert_pressemelding'
  | 'ny_notat'
  | 'redigert_notat'
  | 'deaktivert_notat'

interface LogActivityParams {
  handling: AktivitetsHandling
  tabell: string
  radId?: string
  hendelseId?: string
  hendelseTittel?: string
  detaljer?: Record<string, unknown>
}

export async function logActivity({
  handling,
  tabell,
  radId,
  hendelseId,
  hendelseTittel,
  detaljer,
}: LogActivityParams): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('aktivitetslogg').insert({
      bruker_id: user.id,
      handling,
      tabell,
      rad_id: radId || null,
      hendelse_id: hendelseId || null,
      hendelse_tittel: hendelseTittel || null,
      detaljer: detaljer || {},
    })
  } catch {
    // Logging should never break the app - silently fail
  }
}

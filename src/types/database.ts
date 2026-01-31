export type UserRole = 'admin' | 'operator' | 'public'
export type IncidentStatus = 'pågår' | 'avsluttet'
export type IncidentSeverity = 'lav' | 'middels' | 'høy' | 'kritisk'

export interface Fylke {
  id: string
  navn: string
  nummer: string
  created_at: string
}

export interface Kommune {
  id: string
  navn: string
  nummer: string
  fylke_id: string
  created_at: string
}

export interface Brannvesen {
  id: string
  navn: string
  kort_navn: string
  kommune_ids: string[]
  fylke_id: string
  kontakt_epost: string | null
  kontakt_telefon: string | null
  aktiv: boolean
  created_at: string
}

export interface IncidentCategory {
  id: string
  navn: string
  ikon: string
  farge: string
  beskrivelse: string
  created_at: string
}

export interface Incident {
  id: string
  brannvesen_id: string
  kommune_id: string
  fylke_id: string
  kategori_id: string
  tittel: string
  beskrivelse: string
  sted: string
  status: IncidentStatus
  alvorlighetsgrad: IncidentSeverity
  opprettet_av: string
  opprettet_tidspunkt: string
  oppdatert_tidspunkt: string
  avsluttet_tidspunkt: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  // Joined data
  brannvesen?: Brannvesen
  kommune?: Kommune
  fylke?: Fylke
  kategori?: IncidentCategory
  oppdateringer?: IncidentUpdate[]
  bilder?: IncidentImage[]
}

export interface IncidentUpdate {
  id: string
  hendelse_id: string
  tekst: string
  opprettet_av: string
  opprettet_tidspunkt: string
  created_at: string
}

export interface IncidentImage {
  id: string
  hendelse_id: string
  bilde_url: string
  bildetekst: string | null
  lastet_opp_av: string
  created_at: string
}

export interface InternalNote {
  id: string
  hendelse_id: string
  notat: string
  opprettet_av: string
  opprettet_tidspunkt: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  rolle: UserRole
  fullt_navn: string
  brannvesen_id: string | null
  aktiv: boolean
  created_at: string
}

export interface UserFollowing {
  id: string
  user_id: string
  hendelse_id: string
  created_at: string
}

export interface PushPreference {
  id: string
  user_id: string
  fylke_ids: string[]
  kommune_ids: string[]
  brannvesen_ids: string[]
  kategori_ids: string[]
  kun_pågående: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  handling: string
  tabell: string
  rad_id: string
  detaljer: Record<string, unknown>
  ip_adresse: string | null
  created_at: string
}

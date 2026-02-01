'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { useHendelser, useBrannvesen, useKommuner, useKategorier } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { formatDateTime, formatTime } from '@/lib/utils'
import { useState, use } from 'react'

export default function HendelseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: allHendelser, loading: hendelserLoading, refetch } = useHendelser()
  useRealtimeHendelser(refetch)
  const { data: brannvesen, loading: brannvesenLoading } = useBrannvesen()
  const { data: kommuner, loading: kommunerLoading } = useKommuner()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const [newUpdate, setNewUpdate] = useState('')
  const [newNote, setNewNote] = useState('')
  const [presseTekst, setPresseTekst] = useState('')
  const [presseInitialized, setPresseInitialized] = useState(false)
  const [presseSaved, setPresseSaved] = useState(false)
  const [localUpdates, setLocalUpdates] = useState<{ id: string; hendelse_id: string; tekst: string; opprettet_tidspunkt: string }[]>([])
  const [internalNotes, setInternalNotes] = useState<{ id: string; notat: string; tidspunkt: string }[]>([
    { id: 'n-1', notat: 'Kontaktet eier av bygget. Forsikringsselskap varslet.', tidspunkt: new Date(Date.now() - 30 * 60000).toISOString() },
  ])

  const isLoading = hendelserLoading || brannvesenLoading || kommunerLoading || kategorierLoading
  if (isLoading) return <div className="p-8 text-center text-gray-400">Laster...</div>

  const hendelse = allHendelser.find((h) => h.id === id)

  if (!hendelse) {
    return (
      <DashboardLayout role="operator">
        <div className="p-8 text-center text-gray-400">Hendelse ikke funnet.</div>
      </DashboardLayout>
    )
  }

  // Initialize presse_tekst from DB once
  if (!presseInitialized && hendelse.presse_tekst) {
    setPresseTekst(hendelse.presse_tekst)
    setPresseInitialized(true)
  }

  const updates = [...(hendelse.oppdateringer || []), ...localUpdates]
  const bv = brannvesen.find((b) => b.id === hendelse.brannvesen_id)
  const kommune = kommuner.find((k) => k.id === hendelse.kommune_id)
  const kat = kategorier.find((k) => k.id === hendelse.kategori_id)

  const handleSavePresse = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('hendelser') as any).update({ presse_tekst: presseTekst || null }).eq('id', hendelse.id)
      setPresseSaved(true)
      setTimeout(() => setPresseSaved(false), 2000)
    } catch {
      // Silently fail for demo
    }
  }

  const handleAddUpdate = () => {
    if (!newUpdate.trim()) return
    setLocalUpdates([
      ...localUpdates,
      {
        id: `u-new-${Date.now()}`,
        hendelse_id: hendelse.id,
        tekst: newUpdate,
        opprettet_tidspunkt: new Date().toISOString(),
      },
    ])
    setNewUpdate('')
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    setInternalNotes([
      ...internalNotes,
      {
        id: `n-new-${Date.now()}`,
        notat: newNote,
        tidspunkt: new Date().toISOString(),
      },
    ])
    setNewNote('')
  }

  return (
    <DashboardLayout role="operator">
      <div className="p-4 lg:p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <StatusBadge status={hendelse.status} />
            <SeverityDot severity={hendelse.alvorlighetsgrad} showLabel />
            {kat && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: kat.farge + '22', color: kat.farge }}
              >
                {kat.navn}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{hendelse.tittel}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {bv?.kort_navn} &middot; {kommune?.navn} &middot; {formatDateTime(hendelse.opprettet_tidspunkt)}
          </p>
          {hendelse.status === 'pågår' && (
            <button className="mt-3 px-4 py-2.5 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm hover:bg-green-600/30 transition-colors touch-manipulation">
              Avslutt hendelse
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-2">Beskrivelse</h2>
              <p className="text-sm text-white leading-relaxed">{hendelse.beskrivelse}</p>
              <p className="text-xs text-gray-500 mt-2">{hendelse.sted}</p>
            </div>

            {/* Public updates */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-4">
                Oppdateringer ({updates.length})
              </h2>

              <div className="space-y-3 mb-4">
                {updates.map((upd) => (
                  <div key={upd.id} className="border-l-2 border-blue-500/30 pl-3">
                    <span className="text-xs text-gray-500">{formatTime(upd.opprettet_tidspunkt)}</span>
                    <p className="text-sm text-white">{upd.tekst}</p>
                  </div>
                ))}
                {updates.length === 0 && (
                  <p className="text-sm text-gray-500">Ingen oppdateringer ennå.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  placeholder="Legg til offentlig oppdatering..."
                  className="flex-1 px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUpdate()}
                />
                <button
                  onClick={handleAddUpdate}
                  className="px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors touch-manipulation"
                >
                  Publiser
                </button>
              </div>
            </div>

            {/* Images section */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-4">Bilder</h2>
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] border-dashed rounded-lg p-6 text-center">
                <input type="file" accept="image/*" multiple className="hidden" id="detail-image-upload" />
                <label htmlFor="detail-image-upload" className="cursor-pointer">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-400">Last opp bilder fra hendelsen</p>
                </label>
              </div>
            </div>

            {/* Press message section */}
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <h2 className="text-sm font-semibold text-cyan-400">Pressemelding</h2>
                {presseSaved && <span className="text-xs text-green-400 ml-auto">Lagret!</span>}
              </div>
              <p className="text-xs text-cyan-400/60 mb-3">
                Denne teksten vises for pressebrukere. Bruk den til kontaktinfo, pressekonferanse-detaljer, o.l.
              </p>

              <textarea
                value={presseTekst}
                onChange={(e) => setPresseTekst(e.target.value)}
                placeholder="Skriv pressemelding her... F.eks. kontaktperson, pressekonferanse-tidspunkt, sikkerhetsinformasjon for media."
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-cyan-500/20 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 min-h-[80px] resize-y mb-3"
              />
              <button
                onClick={handleSavePresse}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
              >
                Lagre pressemelding
              </button>
            </div>
          </div>

          {/* Sidebar - Internal notes */}
          <div className="space-y-6">
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="text-sm font-semibold text-yellow-400">Interne notater</h2>
              </div>
              <p className="text-xs text-yellow-400/60 mb-3">Kun synlig for operatører</p>

              <div className="space-y-2 mb-3">
                {internalNotes.map((note) => (
                  <div key={note.id} className="bg-[#1a1a1a] rounded-lg p-2">
                    <span className="text-xs text-gray-500">{formatTime(note.tidspunkt)}</span>
                    <p className="text-xs text-white">{note.notat}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nytt internt notat..."
                  className="flex-1 px-3 py-2.5 bg-[#1a1a1a] border border-yellow-500/20 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30 transition-colors touch-manipulation"
                >
                  Lagre
                </button>
              </div>
            </div>

            {/* Info card */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Detaljer</h2>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Brannvesen</dt>
                  <dd className="text-white">{bv?.kort_navn}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Kommune</dt>
                  <dd className="text-white">{kommune?.navn}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Opprettet</dt>
                  <dd className="text-white">{formatDateTime(hendelse.opprettet_tidspunkt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sist oppdatert</dt>
                  <dd className="text-white">{formatDateTime(hendelse.oppdatert_tidspunkt)}</dd>
                </div>
                {hendelse.latitude && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Koordinater</dt>
                    <dd className="text-white">{hendelse.latitude}, {hendelse.longitude}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

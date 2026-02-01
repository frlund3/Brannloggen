'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useBrukerprofiler, useMedier, invalidateCache } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface PresseSoknad {
  id: string
  fullt_navn: string
  epost: string
  mediehus: string
  medium_id: string | null
  telefon: string | null
  status: string
  opprettet: string
}

export default function AdminPressebrukerePage() {
  const { isAdmin, is110Admin } = useSentralScope()
  const { data: brukere, loading: brukereLoading } = useBrukerprofiler()
  const { data: medier, loading: medierLoading } = useMedier()
  const [soknader, setSoknader] = useState<PresseSoknad[]>([])
  const [soknaderLoading, setSoknaderLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [avvisModal, setAvvisModal] = useState<string | null>(null)
  const [avvisningsgrunn, setAvvisningsgrunn] = useState('')

  const fetchSoknader = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('presse_soknader')
        .select('*')
        .eq('status', 'venter')
        .order('opprettet', { ascending: false })
      if (error) throw error
      setSoknader(data || [])
    } catch {
      // RLS may block if not admin
    } finally {
      setSoknaderLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSoknader()
  }, [fetchSoknader])

  const presseBrukere = brukere.filter(b => b.rolle === 'presse')

  const getMediumNavn = (mediumId: string | null) => {
    if (!mediumId) return null
    return medier.find(m => m.id === mediumId)?.navn || null
  }

  const handleAction = async (soknadId: string, action: 'godkjent' | 'avvist', grunn?: string) => {
    setProcessing(soknadId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('Du må være innlogget'); return }

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-presse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          soknad_id: soknadId,
          action,
          avvisningsgrunn: grunn || undefined,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Ukjent feil')

      if (action === 'godkjent') {
        toast.success(`Pressekonto opprettet for ${result.user?.fullt_navn}. E-post med passordlenke sendt.`)
      } else {
        toast.success('Søknad avvist')
      }

      setSoknader(prev => prev.filter(s => s.id !== soknadId))
      invalidateCache()
      setAvvisModal(null)
      setAvvisningsgrunn('')
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setProcessing(null)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('brukerprofiler').update({ aktiv: !currentActive } as any).eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success(currentActive ? 'Pressebruker deaktivert' : 'Pressebruker aktivert')
      window.location.reload()
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne pressebrukeren?')) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('brukerprofiler') as any).delete().eq('id', id)
      if (error) throw error
      invalidateCache()
      toast.success('Pressebruker slettet')
      window.location.reload()
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const loading = brukereLoading || soknaderLoading || medierLoading

  if (loading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Pressebrukere</h1>
          <p className="text-sm text-gray-400">Behandle søknader og administrer pressekontoer</p>
        </div>

        {/* Pending requests */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            Ventende søknader
            {soknader.length > 0 && (
              <span className="bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">{soknader.length}</span>
            )}
          </h2>

          {soknader.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 text-center text-gray-500 text-sm">
              Ingen ventende søknader
            </div>
          ) : (
            <div className="space-y-3">
              {soknader.map((s) => (
                <div key={s.id} className="bg-[#1a1a1a] rounded-xl border border-orange-500/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium">{s.fullt_navn}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.epost}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">{getMediumNavn(s.medium_id) || s.mediehus}</span>
                        {s.telefon && <span className="text-xs text-gray-500">{s.telefon}</span>}
                        <span className="text-xs text-gray-600">{new Date(s.opprettet).toLocaleDateString('nb-NO')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleAction(s.id, 'godkjent')} disabled={processing === s.id} className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 disabled:opacity-50 touch-manipulation">
                        {processing === s.id ? '...' : 'Godkjenn'}
                      </button>
                      <button onClick={() => setAvvisModal(s.id)} disabled={processing === s.id} className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 disabled:opacity-50 touch-manipulation">
                        Avvis
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active press users */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Aktive pressebrukere ({presseBrukere.length})
          </h2>

          {presseBrukere.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 text-center text-gray-500 text-sm">
              Ingen pressebrukere registrert
            </div>
          ) : (
            <div className="space-y-3">
              {presseBrukere.map((u) => (
                <div key={u.id} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-xs text-white font-bold">{u.fullt_navn.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium">{u.fullt_navn}</p>
                      <p className="text-xs text-gray-400">{u.epost}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-cyan-400 hidden sm:inline">{getMediumNavn(u.medium_id) || '-'}</span>
                      <span className={`text-xs ${u.aktiv ? 'text-green-400' : 'text-red-400'}`}>{u.aktiv ? 'Aktiv' : 'Deaktivert'}</span>
                      <button onClick={() => handleToggleActive(u.id, u.aktiv)} className={`text-xs py-1 touch-manipulation ${u.aktiv ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}>
                        {u.aktiv ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:text-red-300 py-1 touch-manipulation">Slett</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registration link info */}
        <div className="mt-8 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">Presseregistrering</h3>
          <p className="text-xs text-gray-400">
            Journalister kan søke om pressetilgang via registreringssiden. Del denne lenken:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="text-xs bg-[#0a0a0a] text-cyan-400 px-3 py-1.5 rounded border border-[#2a2a2a] flex-1 truncate">
              {typeof window !== 'undefined' ? window.location.origin : ''}/presse-registrering
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/presse-registrering`)
                toast.success('Lenke kopiert!')
              }}
              className="text-xs px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 shrink-0 touch-manipulation"
            >
              Kopier
            </button>
          </div>
        </div>
      </div>

      {/* Avvis modal */}
      {avvisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setAvvisModal(null); setAvvisningsgrunn('') }} />
          <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-white mb-2">Avvis søknad</h2>
            <p className="text-sm text-gray-400 mb-4">
              Søkeren vil ikke bli varslet, men grunnen lagres for referanse.
            </p>
            <textarea
              value={avvisningsgrunn}
              onChange={(e) => setAvvisningsgrunn(e.target.value)}
              placeholder="Valgfri grunn for avvisning..."
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-red-500 resize-none h-20 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleAction(avvisModal, 'avvist', avvisningsgrunn)}
                disabled={processing === avvisModal}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white rounded-lg text-sm font-medium"
              >
                {processing === avvisModal ? 'Avviser...' : 'Avvis'}
              </button>
              <button
                onClick={() => { setAvvisModal(null); setAvvisningsgrunn('') }}
                className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

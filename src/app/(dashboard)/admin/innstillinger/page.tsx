'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useFylker, useKommuner, useBrannvesen, useSentraler } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'

interface PushStats {
  total: number
  active: number
  platforms: Record<string, number>
}

export default function AdminInnstillingerPage() {
  const { isAdmin, is110Admin, isScoped, scope, filterFylker, filterKommuner, filterBrannvesen, filterSentraler } = useSentralScope()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kommuner, loading: kommunerLoading } = useKommuner()
  const { data: brannvesen, loading: brannvesenLoading } = useBrannvesen()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()

  const [pushStats, setPushStats] = useState<PushStats | null>(null)
  const fetchPushStats = useCallback(async () => {
    try {
      const res = await fetch('/api/test-push')
      if (res.ok) setPushStats(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchPushStats() }, [fetchPushStats])

  if (fylkerLoading || kommunerLoading || brannvesenLoading || sentralerLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-theme-secondary">Laster...</div>
      </DashboardLayout>
    )
  }

  const displayFylker = filterFylker(fylker)
  const displayKommuner = filterKommuner(kommuner)
  const displayBrannvesen = filterBrannvesen(brannvesen)
  const displaySentraler = filterSentraler(sentraler)

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme">Innstillinger</h1>
          <p className="text-sm text-theme-secondary">
            {isScoped ? 'Oversikt for dine 110-sentraler' : 'Systemkonfigurasjon og oversikt'}
          </p>
        </div>

        {/* Scoped info for 110-admin */}
        {isScoped && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-theme mb-4">Din tilgang</h2>
            <div className="bg-theme-card rounded-xl border border-theme p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-theme-muted mb-1">Tilknyttede 110-sentraler</p>
                  <div className="flex flex-wrap gap-1">
                    {displaySentraler.map(s => (
                      <span key={s.id} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{s.kort_navn}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-theme-muted mb-1">Fylker i scope</p>
                  <div className="flex flex-wrap gap-1">
                    {displayFylker.map(f => (
                      <span key={f.id} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{f.navn}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* System stats */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-theme mb-4">
            {isScoped ? 'Oversikt' : 'Systemoversikt'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-theme-card rounded-xl border border-theme p-4">
              <p className="text-xs text-theme-secondary">110-sentraler</p>
              <p className="text-2xl font-bold text-theme">{displaySentraler.length}</p>
            </div>
            <div className="bg-theme-card rounded-xl border border-theme p-4">
              <p className="text-xs text-theme-secondary">Fylker</p>
              <p className="text-2xl font-bold text-theme">{displayFylker.length}</p>
            </div>
            <div className="bg-theme-card rounded-xl border border-theme p-4">
              <p className="text-xs text-theme-secondary">Kommuner</p>
              <p className="text-2xl font-bold text-theme">{displayKommuner.length}</p>
            </div>
            <div className="bg-theme-card rounded-xl border border-theme p-4">
              <p className="text-xs text-theme-secondary">Brannvesen</p>
              <p className="text-2xl font-bold text-theme">{displayBrannvesen.length}</p>
            </div>
          </div>
        </section>

        {/* Supabase connection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-theme mb-4">Database</h2>
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-400">Tilkoblet</span>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-theme-muted">Provider</dt>
                <dd className="text-theme">Supabase</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-theme-muted">URL</dt>
                <dd className="text-theme font-mono">{process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0]}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-theme-muted">Bildelagring</dt>
                <dd className="text-theme">Supabase Storage</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Push notifications */}
        {isAdmin && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-theme mb-4">Push-varslinger</h2>
            <div className="bg-theme-card rounded-xl border border-theme p-4 space-y-4">
              {pushStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-theme-muted">Totalt registrert</p>
                    <p className="text-xl font-bold text-theme">{pushStats.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted">Aktive</p>
                    <p className="text-xl font-bold text-green-400">{pushStats.active}</p>
                  </div>
                  {Object.entries(pushStats.platforms).map(([platform, count]) => (
                    <div key={platform}>
                      <p className="text-xs text-theme-muted">{platform}</p>
                      <p className="text-xl font-bold text-theme">{count}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-theme-secondary">Laster statistikk...</p>
              )}

            </div>
          </section>
        )}

        {/* Link to activity log */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-theme mb-4">Aktivitetslogg</h2>
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <p className="text-sm text-theme-secondary mb-3">
              All aktivitet i systemet logges og kan filtreres etter bruker, type og tidspunkt.
            </p>
            <a
              href="/admin/logg"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Se aktivitetslogg
            </a>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

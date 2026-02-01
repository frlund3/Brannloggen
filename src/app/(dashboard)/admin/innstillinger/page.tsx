'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useFylker, useKommuner, useBrannvesen, useSentraler } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'

export default function AdminInnstillingerPage() {
  const { isAdmin, is110Admin, isScoped, scope, filterFylker, filterKommuner, filterBrannvesen, filterSentraler } = useSentralScope()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kommuner, loading: kommunerLoading } = useKommuner()
  const { data: brannvesen, loading: brannvesenLoading } = useBrannvesen()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()

  if (fylkerLoading || kommunerLoading || brannvesenLoading || sentralerLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-gray-400">Laster...</div>
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
          <h1 className="text-2xl font-bold text-white">Innstillinger</h1>
          <p className="text-sm text-gray-400">
            {isScoped ? 'Oversikt for dine 110-sentraler' : 'Systemkonfigurasjon og oversikt'}
          </p>
        </div>

        {/* Scoped info for 110-admin */}
        {isScoped && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Din tilgang</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tilknyttede 110-sentraler</p>
                  <div className="flex flex-wrap gap-1">
                    {displaySentraler.map(s => (
                      <span key={s.id} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{s.kort_navn}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fylker i scope</p>
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
          <h2 className="text-lg font-semibold text-white mb-4">
            {isScoped ? 'Oversikt' : 'Systemoversikt'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">110-sentraler</p>
              <p className="text-2xl font-bold text-white">{displaySentraler.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">Fylker</p>
              <p className="text-2xl font-bold text-white">{displayFylker.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">Kommuner</p>
              <p className="text-2xl font-bold text-white">{displayKommuner.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">Brannvesen</p>
              <p className="text-2xl font-bold text-white">{displayBrannvesen.length}</p>
            </div>
          </div>
        </section>

        {/* Supabase connection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Database</h2>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-400">Tilkoblet</span>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-500">Provider</dt>
                <dd className="text-white">Supabase</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">URL</dt>
                <dd className="text-white font-mono">{process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0]}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Bildelagring</dt>
                <dd className="text-white">Supabase Storage</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Audit log info */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Sikkerhetslogg</h2>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-sm text-gray-400">
              Alle handlinger logges automatisk med bruker-ID, tidspunkt og detaljer via Supabase.
              Inkluderer opprettelse, endring og sletting av hendelser, oppdateringer, interne notater og brukerprofiler.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Loggene er tilgjengelig i Supabase Dashboard under Authentication &gt; Logs og Database &gt; Logs.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

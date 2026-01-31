'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { fylker } from '@/data/fylker'
import { kommuner } from '@/data/kommuner'
import { brannvesen } from '@/data/brannvesen'

export default function AdminInnstillingerPage() {
  return (
    <DashboardLayout role="admin">
      <div className="p-4 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Innstillinger</h1>
          <p className="text-sm text-gray-400">Systemkonfigurasjon og oversikt</p>
        </div>

        {/* System stats */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Systemoversikt</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">Fylker</p>
              <p className="text-2xl font-bold text-white">{fylker.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">Kommuner</p>
              <p className="text-2xl font-bold text-white">{kommuner.length}</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
              <p className="text-xs text-gray-400">Brannvesen</p>
              <p className="text-2xl font-bold text-white">{brannvesen.length}</p>
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
              Alle handlinger logges automatisk med bruker-ID, tidspunkt og detaljer.
              Inkluderer opprettelse, endring og sletting av hendelser, oppdateringer, interne notater og brukerprofiler.
            </p>
            <div className="mt-3 space-y-2">
              {[
                { tid: '20:24', bruker: 'Kari Operatør', handling: 'Opprettet hendelse: Brann: Bergen, Sandviken' },
                { tid: '20:15', bruker: 'Ole Vansen', handling: 'La til oppdatering på hendelse h-003' },
                { tid: '19:58', bruker: 'Frank Lunde', handling: 'Opprettet bruker: Per Hansen' },
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500 shrink-0">{log.tid}</span>
                  <span className="text-blue-400 shrink-0">{log.bruker}</span>
                  <span className="text-gray-400">{log.handling}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useSentraler, useFylker, useKategorier, usePushAbonnenter } from '@/hooks/useSupabaseData'
import type { PushAbonnent } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState } from 'react'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminStatistikkPage() {
  const { is110Admin, isOperator, isScoped, filterSentraler } = useSentralScope()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const { data: abonnenter, loading: abonnenterLoading } = usePushAbonnenter()
  const [selectedSub, setSelectedSub] = useState<PushAbonnent | null>(null)
  const [filterPush, setFilterPush] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')

  if (sentralerLoading || fylkerLoading || kategorierLoading || abonnenterLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : isOperator ? 'operator' : 'admin'}>
        <div className="p-8 text-center text-theme-secondary">Laster...</div>
      </DashboardLayout>
    )
  }

  // Scope for 110-admin
  const scopedSubs = isScoped
    ? abonnenter.filter(s => s.sentral_ids.length === 0 || s.sentral_ids.some(sId => filterSentraler(sentraler).map(x => x.id).includes(sId)))
    : abonnenter

  const filteredSubs = scopedSubs.filter(s => {
    if (filterPush === 'aktiv' && !s.push_aktiv) return false
    if (filterPush === 'inaktiv' && s.push_aktiv) return false
    if (filterPlatform && s.platform !== filterPlatform) return false
    return true
  })

  // Stats
  const total = scopedSubs.length
  const pushAktive = scopedSubs.filter(s => s.push_aktiv).length
  const pushInaktive = scopedSubs.filter(s => !s.push_aktiv).length
  const kunPågående = scopedSubs.filter(s => s.kun_pågående).length

  // Platform stats
  const platformStats = [
    { label: 'iOS', count: scopedSubs.filter(s => s.platform === 'iOS').length, aktiv: scopedSubs.filter(s => s.platform === 'iOS' && s.push_aktiv).length, color: 'text-blue-400' },
    { label: 'Android', count: scopedSubs.filter(s => s.platform === 'Android').length, aktiv: scopedSubs.filter(s => s.platform === 'Android' && s.push_aktiv).length, color: 'text-green-400' },
    { label: 'Web', count: scopedSubs.filter(s => s.platform === 'Web').length, aktiv: scopedSubs.filter(s => s.platform === 'Web' && s.push_aktiv).length, color: 'text-purple-400' },
  ]

  // Sentral popularity
  const sentralCounts: Record<string, number> = {}
  scopedSubs.forEach(s => {
    s.sentral_ids.forEach(sId => {
      sentralCounts[sId] = (sentralCounts[sId] || 0) + 1
    })
  })
  const noFilterCount = scopedSubs.filter(s => s.sentral_ids.length === 0).length
  const availableSentraler = isScoped ? filterSentraler(sentraler) : sentraler
  const sentralStats = availableSentraler
    .map(s => ({ ...s, count: sentralCounts[s.id] || 0 }))
    .sort((a, b) => b.count - a.count)

  // Fylke popularity
  const fylkeCounts: Record<string, number> = {}
  scopedSubs.forEach(s => {
    s.fylke_ids.forEach(fId => {
      fylkeCounts[fId] = (fylkeCounts[fId] || 0) + 1
    })
  })
  const fylkeStats = fylker
    .map(f => ({ ...f, count: fylkeCounts[f.id] || 0 }))
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count)

  // Kategori popularity
  const kategoriCounts: Record<string, number> = {}
  scopedSubs.forEach(s => {
    s.kategori_ids.forEach(kId => {
      kategoriCounts[kId] = (kategoriCounts[kId] || 0) + 1
    })
  })
  const kategoriStats = kategorier
    .map(k => ({ ...k, count: kategoriCounts[k.id] || 0 }))
    .filter(k => k.count > 0)
    .sort((a, b) => b.count - a.count)

  const getPlatformColor = (p: string) => {
    switch (p) {
      case 'iOS': return 'bg-blue-500/20 text-blue-400'
      case 'Android': return 'bg-green-500/20 text-green-400'
      case 'Web': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : isOperator ? 'operator' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme">Statistikk Varslinger</h1>
          <p className="text-sm text-theme-secondary">
            {isScoped ? 'Push-abonnementer for dine sentraler' : 'Oversikt over push-abonnementer og enheter'}
          </p>
          <p className="text-xs text-theme-muted mt-1">Push-varsler er tilgjengelig for alle - innlogging er ikke nødvendig</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <p className="text-xs text-theme-secondary">Registrerte enheter</p>
            <p className="text-2xl font-bold text-theme">{total}</p>
          </div>
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <p className="text-xs text-theme-secondary">Push aktiv</p>
            <p className="text-2xl font-bold text-green-400">{pushAktive}</p>
          </div>
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <p className="text-xs text-theme-secondary">Push deaktivert</p>
            <p className="text-2xl font-bold text-red-400">{pushInaktive}</p>
          </div>
          <div className="bg-theme-card rounded-xl border border-theme p-4">
            <p className="text-xs text-theme-secondary">Kun pågående</p>
            <p className="text-2xl font-bold text-yellow-400">{kunPågående}</p>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Platform distribution */}
          <section>
            <h2 className="text-lg font-semibold text-theme mb-4">Enheter per plattform</h2>
            <div className="bg-theme-card rounded-xl border border-theme p-4 space-y-3">
              {platformStats.map(p => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className={`text-sm ${p.color}`}>{p.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 sm:w-32 bg-theme-card-inner rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-theme-secondary w-20 text-right">{p.aktiv}/{p.count} aktiv</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Abonnement per 110-sentral */}
          <section>
            <h2 className="text-lg font-semibold text-theme mb-4">Abonnement per 110-sentral</h2>
            <div className="bg-theme-card rounded-xl border border-theme p-4 space-y-3">
              {noFilterCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-secondary italic">Alle sentraler (ingen filter)</span>
                  <span className="text-xs text-theme-secondary">{noFilterCount} enheter</span>
                </div>
              )}
              {sentralStats.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm text-theme">{s.kort_navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 sm:w-32 bg-theme-card-inner rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-theme-secondary w-16 text-right">{s.count} enheter</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Abonnement per fylke */}
          <section>
            <h2 className="text-lg font-semibold text-theme mb-4">Abonnement per fylke</h2>
            <div className="bg-theme-card rounded-xl border border-theme p-4 space-y-3">
              {fylkeStats.length > 0 ? fylkeStats.map(f => (
                <div key={f.id} className="flex items-center justify-between">
                  <span className="text-sm text-theme">{f.navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 sm:w-32 bg-theme-card-inner rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${total > 0 ? (f.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-theme-secondary w-16 text-right">{f.count} enheter</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-theme-muted">Ingen fylkefiltre registrert</p>
              )}
            </div>
          </section>

          {/* Abonnement per kategori */}
          <section>
            <h2 className="text-lg font-semibold text-theme mb-4">Abonnement per kategori</h2>
            <div className="bg-theme-card rounded-xl border border-theme p-4 space-y-3">
              {kategoriStats.length > 0 ? kategoriStats.map(k => (
                <div key={k.id} className="flex items-center justify-between">
                  <span className="text-sm text-theme">{k.navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 sm:w-32 bg-theme-card-inner rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${total > 0 ? (k.count / total) * 100 : 0}%`, backgroundColor: k.farge }}
                      />
                    </div>
                    <span className="text-xs text-theme-secondary w-16 text-right">{k.count} enheter</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-theme-muted">Ingen kategorifiltre registrert</p>
              )}
            </div>
          </section>
        </div>

        {/* Subscriber table */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-theme mb-3">Push-abonnenter</h2>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="px-3 py-1.5 bg-theme-card border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Alle plattformer</option>
                <option value="iOS">iOS</option>
                <option value="Android">Android</option>
                <option value="Web">Web</option>
              </select>
              <select
                value={filterPush}
                onChange={(e) => setFilterPush(e.target.value)}
                className="px-3 py-1.5 bg-theme-card border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Alle</option>
                <option value="aktiv">Push aktiv</option>
                <option value="inaktiv">Push inaktiv</option>
              </select>
            </div>
          </div>

          <div className="bg-theme-card rounded-xl border border-theme overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium">Enhet</th>
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium">Plattform</th>
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium">Push</th>
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium hidden md:table-cell">Sentraler</th>
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium hidden md:table-cell">Kategorier</th>
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium hidden lg:table-cell">Sist aktiv</th>
                    <th className="text-left px-4 py-3 text-xs text-theme-secondary font-medium">Detaljer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.sort((a, b) => new Date(b.sist_aktiv).getTime() - new Date(a.sist_aktiv).getTime()).map((sub) => {
                    const subSentraler = sub.sentral_ids.map(sId => sentraler.find(s => s.id === sId)).filter(Boolean)
                    const subKategorier = sub.kategori_ids.map(kId => kategorier.find(k => k.id === kId)).filter(Boolean)
                    return (
                      <tr key={sub.id} className="border-b border-theme hover:bg-theme-card-hover">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-theme font-mono">{sub.device_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${getPlatformColor(sub.platform)}`}>
                            {sub.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${sub.push_aktiv ? 'text-green-400' : 'text-red-400'}`}>
                            {sub.push_aktiv ? 'Aktiv' : 'Av'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {subSentraler.length > 0 ? subSentraler.slice(0, 2).map(s => (
                              <span key={s!.id} className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">{s!.kort_navn}</span>
                            )) : <span className="text-xs text-theme-dim">Alle</span>}
                            {subSentraler.length > 2 && <span className="text-xs text-theme-muted">+{subSentraler.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {subKategorier.length > 0 ? subKategorier.slice(0, 2).map(k => (
                              <span key={k!.id} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: k!.farge + '22', color: k!.farge }}>{k!.navn.split(' ')[0]}</span>
                            )) : <span className="text-xs text-theme-dim">Alle</span>}
                            {subKategorier.length > 2 && <span className="text-xs text-theme-muted">+{subKategorier.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-theme-secondary">{formatDateTime(sub.sist_aktiv)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedSub(sub)} className="text-xs text-blue-400 hover:text-blue-300">Vis</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-theme">
              <p className="text-xs text-theme-muted">Viser {filteredSubs.length} av {scopedSubs.length} enheter</p>
            </div>
          </div>
        </section>

        {/* Detail modal */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-theme-overlay" onClick={() => setSelectedSub(null)} />
            <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-theme">Enhet: {selectedSub.device_id}</h2>
                <button onClick={() => setSelectedSub(null)} className="text-theme-secondary hover:text-theme">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-theme-card-inner rounded-lg p-3">
                    <p className="text-xs text-theme-muted">Plattform</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${getPlatformColor(selectedSub.platform)}`}>{selectedSub.platform}</span>
                  </div>
                  <div className="bg-theme-card-inner rounded-lg p-3">
                    <p className="text-xs text-theme-muted">Push-varsler</p>
                    <p className={`text-sm font-medium ${selectedSub.push_aktiv ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedSub.push_aktiv ? 'Aktivert' : 'Deaktivert'}
                    </p>
                  </div>
                  <div className="bg-theme-card-inner rounded-lg p-3">
                    <p className="text-xs text-theme-muted">Kun pågående</p>
                    <p className="text-sm text-theme">{selectedSub.kun_pågående ? 'Ja' : 'Nei'}</p>
                  </div>
                  <div className="bg-theme-card-inner rounded-lg p-3">
                    <p className="text-xs text-theme-muted">Registrert</p>
                    <p className="text-sm text-theme">{formatDateTime(selectedSub.registrert)}</p>
                  </div>
                  <div className="bg-theme-card-inner rounded-lg p-3 col-span-2">
                    <p className="text-xs text-theme-muted">Sist aktiv</p>
                    <p className="text-sm text-theme">{formatDateTime(selectedSub.sist_aktiv)}</p>
                  </div>
                </div>

                <div className="bg-theme-card-inner rounded-lg p-3">
                  <p className="text-xs text-theme-muted mb-1">Push-token</p>
                  <p className="text-xs text-theme-secondary font-mono break-all">{selectedSub.push_token}</p>
                </div>

                <div>
                  <p className="text-sm text-theme-secondary mb-2">110-sentraler</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.sentral_ids.length > 0
                      ? selectedSub.sentral_ids.map(sId => {
                          const s = sentraler.find(x => x.id === sId)
                          return s ? <span key={sId} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{s.kort_navn}</span> : null
                        })
                      : <span className="text-xs text-theme-muted">Alle sentraler (ingen filter)</span>
                    }
                  </div>
                </div>

                <div>
                  <p className="text-sm text-theme-secondary mb-2">Fylker</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.fylke_ids.length > 0
                      ? selectedSub.fylke_ids.map(fId => {
                          const f = fylker.find(x => x.id === fId)
                          return f ? <span key={fId} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{f.navn}</span> : null
                        })
                      : <span className="text-xs text-theme-muted">Alle fylker (ingen filter)</span>
                    }
                  </div>
                </div>

                <div>
                  <p className="text-sm text-theme-secondary mb-2">Kategorier</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.kategori_ids.length > 0
                      ? selectedSub.kategori_ids.map(kId => {
                          const k = kategorier.find(x => x.id === kId)
                          return k ? <span key={kId} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: k.farge + '22', color: k.farge }}>{k.navn}</span> : null
                        })
                      : <span className="text-xs text-theme-muted">Alle kategorier (ingen filter)</span>
                    }
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => setSelectedSub(null)} className="w-full py-2.5 bg-theme-card-inner border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors">Lukk</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

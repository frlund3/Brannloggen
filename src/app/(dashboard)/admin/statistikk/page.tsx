'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useSentraler, useFylker, useKategorier } from '@/hooks/useSupabaseData'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState } from 'react'

// Push subscribers are anonymous devices/browsers - not logged-in users
// Anyone can subscribe to push notifications without being logged in
interface PushSubscriber {
  id: string
  device_id: string
  platform: string // 'iOS' | 'Android' | 'Web'
  push_token: string
  push_aktiv: boolean
  prefs: {
    sentral_ids: string[]
    fylke_ids: string[]
    kategori_ids: string[]
    kun_pågående: boolean
  }
  registrert: string
  sist_aktiv: string
}

// Mock data representing anonymous push subscribers (devices)
const mockSubscribers: PushSubscriber[] = [
  { id: 'ps-1', device_id: 'dev-a1b2c3', platform: 'iOS', push_token: 'ExponentPushToken[abc123]', push_aktiv: true,
    prefs: { sentral_ids: ['s-vestland'], fylke_ids: ['f-46'], kategori_ids: ['kat-brann-bygning', 'kat-brann-annet'], kun_pågående: false },
    registrert: '2025-01-10T08:30:00', sist_aktiv: '2025-01-30T23:45:00' },
  { id: 'ps-2', device_id: 'dev-d4e5f6', platform: 'Android', push_token: 'ExponentPushToken[def456]', push_aktiv: true,
    prefs: { sentral_ids: ['s-oslo', 's-ost'], fylke_ids: ['f-03', 'f-32'], kategori_ids: [], kun_pågående: true },
    registrert: '2025-01-12T14:20:00', sist_aktiv: '2025-01-30T22:10:00' },
  { id: 'ps-3', device_id: 'dev-g7h8i9', platform: 'iOS', push_token: 'ExponentPushToken[ghi789]', push_aktiv: true,
    prefs: { sentral_ids: ['s-vestland'], fylke_ids: ['f-46'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-14T09:00:00', sist_aktiv: '2025-01-30T20:30:00' },
  { id: 'ps-4', device_id: 'dev-j0k1l2', platform: 'Web', push_token: 'web-push-token-jkl012', push_aktiv: true,
    prefs: { sentral_ids: ['s-oslo', 's-ost'], fylke_ids: ['f-03', 'f-32', 'f-31'], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke'], kun_pågående: true },
    registrert: '2025-01-15T11:30:00', sist_aktiv: '2025-01-30T21:15:00' },
  { id: 'ps-5', device_id: 'dev-m3n4o5', platform: 'iOS', push_token: 'ExponentPushToken[mno345]', push_aktiv: false,
    prefs: { sentral_ids: ['s-trondelag'], fylke_ids: ['f-50'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-16T16:00:00', sist_aktiv: '2025-01-29T14:00:00' },
  { id: 'ps-6', device_id: 'dev-p6q7r8', platform: 'Android', push_token: 'ExponentPushToken[pqr678]', push_aktiv: true,
    prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke', 'kat-cbrne'], kun_pågående: false },
    registrert: '2025-01-17T08:00:00', sist_aktiv: '2025-01-30T23:50:00' },
  { id: 'ps-7', device_id: 'dev-s9t0u1', platform: 'Web', push_token: 'web-push-token-stu901', push_aktiv: true,
    prefs: { sentral_ids: ['s-oslo', 's-vestland', 's-trondelag'], fylke_ids: ['f-03', 'f-46', 'f-50'], kategori_ids: ['kat-brann-bygning'], kun_pågående: true },
    registrert: '2025-01-18T12:00:00', sist_aktiv: '2025-01-30T19:00:00' },
  { id: 'ps-8', device_id: 'dev-v2w3x4', platform: 'iOS', push_token: 'ExponentPushToken[vwx234]', push_aktiv: false,
    prefs: { sentral_ids: ['s-agder'], fylke_ids: ['f-42'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-19T10:30:00', sist_aktiv: '2025-01-20T10:00:00' },
  { id: 'ps-9', device_id: 'dev-y5z6a7', platform: 'Android', push_token: 'ExponentPushToken[yza567]', push_aktiv: true,
    prefs: { sentral_ids: ['s-sorost'], fylke_ids: ['f-39', 'f-40', 'f-33'], kategori_ids: ['kat-brann-bygning', 'kat-brann-annet'], kun_pågående: false },
    registrert: '2025-01-20T09:00:00', sist_aktiv: '2025-01-30T18:30:00' },
  { id: 'ps-10', device_id: 'dev-b8c9d0', platform: 'iOS', push_token: 'ExponentPushToken[bcd890]', push_aktiv: true,
    prefs: { sentral_ids: ['s-vestland', 's-rogaland'], fylke_ids: ['f-46', 'f-11'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-21T13:00:00', sist_aktiv: '2025-01-30T22:45:00' },
  { id: 'ps-11', device_id: 'dev-e1f2g3', platform: 'Web', push_token: 'web-push-token-efg123', push_aktiv: false,
    prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-22T07:30:00', sist_aktiv: '2025-01-25T12:00:00' },
  { id: 'ps-12', device_id: 'dev-h4i5j6', platform: 'Android', push_token: 'ExponentPushToken[hij456]', push_aktiv: true,
    prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke', 'kat-cbrne', 'kat-brann-annet'], kun_pågående: false },
    registrert: '2025-01-23T15:00:00', sist_aktiv: '2025-01-30T23:30:00' },
  { id: 'ps-13', device_id: 'dev-k7l8m9', platform: 'iOS', push_token: 'ExponentPushToken[klm789]', push_aktiv: true,
    prefs: { sentral_ids: ['s-innlandet'], fylke_ids: ['f-34'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-24T11:00:00', sist_aktiv: '2025-01-30T17:00:00' },
  { id: 'ps-14', device_id: 'dev-n0o1p2', platform: 'Web', push_token: 'web-push-token-nop012', push_aktiv: true,
    prefs: { sentral_ids: ['s-agder', 's-rogaland'], fylke_ids: ['f-42', 'f-11'], kategori_ids: ['kat-brann-bygning'], kun_pågående: true },
    registrert: '2025-01-25T08:00:00', sist_aktiv: '2025-01-30T20:00:00' },
  { id: 'ps-15', device_id: 'dev-q3r4s5', platform: 'Android', push_token: 'ExponentPushToken[qrs345]', push_aktiv: true,
    prefs: { sentral_ids: ['s-trondelag', 's-more'], fylke_ids: ['f-50', 'f-15'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-26T10:30:00', sist_aktiv: '2025-01-30T21:30:00' },
  { id: 'ps-16', device_id: 'dev-t6u7v8', platform: 'iOS', push_token: 'ExponentPushToken[tuv678]', push_aktiv: true,
    prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-27T14:00:00', sist_aktiv: '2025-01-30T23:00:00' },
  { id: 'ps-17', device_id: 'dev-w9x0y1', platform: 'Android', push_token: 'ExponentPushToken[wxy901]', push_aktiv: false,
    prefs: { sentral_ids: ['s-nordland'], fylke_ids: ['f-18'], kategori_ids: [], kun_pågående: false },
    registrert: '2025-01-28T09:00:00', sist_aktiv: '2025-01-28T15:00:00' },
  { id: 'ps-18', device_id: 'dev-z2a3b4', platform: 'iOS', push_token: 'ExponentPushToken[zab234]', push_aktiv: true,
    prefs: { sentral_ids: ['s-oslo'], fylke_ids: ['f-03'], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke'], kun_pågående: true },
    registrert: '2025-01-29T12:00:00', sist_aktiv: '2025-01-30T22:00:00' },
]

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminStatistikkPage() {
  const { is110Admin, isScoped, filterSentraler } = useSentralScope()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const [selectedSub, setSelectedSub] = useState<PushSubscriber | null>(null)
  const [filterPush, setFilterPush] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')

  if (sentralerLoading || fylkerLoading || kategorierLoading) {
    return (
      <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
        <div className="p-8 text-center text-gray-400">Laster...</div>
      </DashboardLayout>
    )
  }

  // Scope for 110-admin
  const scopedSubs = isScoped
    ? mockSubscribers.filter(s => s.prefs.sentral_ids.length === 0 || s.prefs.sentral_ids.some(sId => filterSentraler(sentraler).map(x => x.id).includes(sId)))
    : mockSubscribers

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
  const kunPågående = scopedSubs.filter(s => s.prefs.kun_pågående).length

  // Platform stats
  const platformStats = [
    { label: 'iOS', count: scopedSubs.filter(s => s.platform === 'iOS').length, aktiv: scopedSubs.filter(s => s.platform === 'iOS' && s.push_aktiv).length, color: 'text-blue-400' },
    { label: 'Android', count: scopedSubs.filter(s => s.platform === 'Android').length, aktiv: scopedSubs.filter(s => s.platform === 'Android' && s.push_aktiv).length, color: 'text-green-400' },
    { label: 'Web', count: scopedSubs.filter(s => s.platform === 'Web').length, aktiv: scopedSubs.filter(s => s.platform === 'Web' && s.push_aktiv).length, color: 'text-purple-400' },
  ]

  // Sentral popularity
  const sentralCounts: Record<string, number> = {}
  scopedSubs.forEach(s => {
    s.prefs.sentral_ids.forEach(sId => {
      sentralCounts[sId] = (sentralCounts[sId] || 0) + 1
    })
  })
  const noFilterCount = scopedSubs.filter(s => s.prefs.sentral_ids.length === 0).length
  const availableSentraler = isScoped ? filterSentraler(sentraler) : sentraler
  const sentralStats = availableSentraler
    .map(s => ({ ...s, count: sentralCounts[s.id] || 0 }))
    .sort((a, b) => b.count - a.count)

  // Fylke popularity
  const fylkeCounts: Record<string, number> = {}
  scopedSubs.forEach(s => {
    s.prefs.fylke_ids.forEach(fId => {
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
    s.prefs.kategori_ids.forEach(kId => {
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
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Statistikk</h1>
          <p className="text-sm text-gray-400">
            {isScoped ? 'Push-abonnementer for dine sentraler' : 'Oversikt over push-abonnementer og enheter'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Push-varsler er tilgjengelig for alle - innlogging er ikke nødvendig</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Registrerte enheter</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Push aktiv</p>
            <p className="text-2xl font-bold text-green-400">{pushAktive}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Push deaktivert</p>
            <p className="text-2xl font-bold text-red-400">{pushInaktive}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Kun pågående</p>
            <p className="text-2xl font-bold text-yellow-400">{kunPågående}</p>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Platform distribution */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Enheter per plattform</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              {platformStats.map(p => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className={`text-sm ${p.color}`}>{p.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0a0a0a] rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${total > 0 ? (p.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right">{p.aktiv}/{p.count} aktiv</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Abonnement per 110-sentral */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Abonnement per 110-sentral</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              {noFilterCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 italic">Alle sentraler (ingen filter)</span>
                  <span className="text-xs text-gray-400">{noFilterCount} enheter</span>
                </div>
              )}
              {sentralStats.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm text-white">{s.kort_navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0a0a0a] rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{s.count} enheter</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Abonnement per fylke */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Abonnement per fylke</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              {fylkeStats.length > 0 ? fylkeStats.map(f => (
                <div key={f.id} className="flex items-center justify-between">
                  <span className="text-sm text-white">{f.navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0a0a0a] rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${total > 0 ? (f.count / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{f.count} enheter</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Ingen fylkefiltre registrert</p>
              )}
            </div>
          </section>

          {/* Abonnement per kategori */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Abonnement per kategori</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              {kategoriStats.length > 0 ? kategoriStats.map(k => (
                <div key={k.id} className="flex items-center justify-between">
                  <span className="text-sm text-white">{k.navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0a0a0a] rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${total > 0 ? (k.count / total) * 100 : 0}%`, backgroundColor: k.farge }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{k.count} enheter</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Ingen kategorifiltre registrert</p>
              )}
            </div>
          </section>
        </div>

        {/* Subscriber table */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-white">Push-abonnenter</h2>
            <div className="flex gap-2">
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Alle plattformer</option>
                <option value="iOS">iOS</option>
                <option value="Android">Android</option>
                <option value="Web">Web</option>
              </select>
              <select
                value={filterPush}
                onChange={(e) => setFilterPush(e.target.value)}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Alle</option>
                <option value="aktiv">Push aktiv</option>
                <option value="inaktiv">Push inaktiv</option>
              </select>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Enhet</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Plattform</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Push</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Sentraler</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Kategorier</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Sist aktiv</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Detaljer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.sort((a, b) => new Date(b.sist_aktiv).getTime() - new Date(a.sist_aktiv).getTime()).map((sub) => {
                    const subSentraler = sub.prefs.sentral_ids.map(sId => sentraler.find(s => s.id === sId)).filter(Boolean)
                    const subKategorier = sub.prefs.kategori_ids.map(kId => kategorier.find(k => k.id === kId)).filter(Boolean)
                    return (
                      <tr key={sub.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-white font-mono">{sub.device_id}</p>
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
                            )) : <span className="text-xs text-gray-600">Alle</span>}
                            {subSentraler.length > 2 && <span className="text-xs text-gray-500">+{subSentraler.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {subKategorier.length > 0 ? subKategorier.slice(0, 2).map(k => (
                              <span key={k!.id} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: k!.farge + '22', color: k!.farge }}>{k!.navn.split(' ')[0]}</span>
                            )) : <span className="text-xs text-gray-600">Alle</span>}
                            {subKategorier.length > 2 && <span className="text-xs text-gray-500">+{subKategorier.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-gray-400">{formatDateTime(sub.sist_aktiv)}</span>
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
            <div className="px-4 py-3 border-t border-[#2a2a2a]">
              <p className="text-xs text-gray-500">Viser {filteredSubs.length} av {scopedSubs.length} enheter</p>
            </div>
          </div>
        </section>

        {/* Detail modal */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedSub(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Enhet: {selectedSub.device_id}</h2>
                <button onClick={() => setSelectedSub(null)} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Plattform</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${getPlatformColor(selectedSub.platform)}`}>{selectedSub.platform}</span>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Push-varsler</p>
                    <p className={`text-sm font-medium ${selectedSub.push_aktiv ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedSub.push_aktiv ? 'Aktivert' : 'Deaktivert'}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Kun pågående</p>
                    <p className="text-sm text-white">{selectedSub.prefs.kun_pågående ? 'Ja' : 'Nei'}</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Registrert</p>
                    <p className="text-sm text-white">{formatDateTime(selectedSub.registrert)}</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500">Sist aktiv</p>
                    <p className="text-sm text-white">{formatDateTime(selectedSub.sist_aktiv)}</p>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Push-token</p>
                  <p className="text-xs text-gray-400 font-mono break-all">{selectedSub.push_token}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">110-sentraler</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.prefs.sentral_ids.length > 0
                      ? selectedSub.prefs.sentral_ids.map(sId => {
                          const s = sentraler.find(x => x.id === sId)
                          return s ? <span key={sId} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{s.kort_navn}</span> : null
                        })
                      : <span className="text-xs text-gray-500">Alle sentraler (ingen filter)</span>
                    }
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Fylker</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.prefs.fylke_ids.length > 0
                      ? selectedSub.prefs.fylke_ids.map(fId => {
                          const f = fylker.find(x => x.id === fId)
                          return f ? <span key={fId} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{f.navn}</span> : null
                        })
                      : <span className="text-xs text-gray-500">Alle fylker (ingen filter)</span>
                    }
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Kategorier</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSub.prefs.kategori_ids.length > 0
                      ? selectedSub.prefs.kategori_ids.map(kId => {
                          const k = kategorier.find(x => x.id === kId)
                          return k ? <span key={kId} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: k.farge + '22', color: k.farge }}>{k.navn}</span> : null
                        })
                      : <span className="text-xs text-gray-500">Alle kategorier (ingen filter)</span>
                    }
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => setSelectedSub(null)} className="w-full py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Lukk</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { sentraler } from '@/data/sentraler'
import { fylker } from '@/data/fylker'
import { kategorier } from '@/data/kategorier'
import { useSentralScope } from '@/hooks/useSentralScope'
import { useState } from 'react'

// Mock subscription/push data per user
interface UserSubscription {
  id: string
  fullt_navn: string
  epost: string
  rolle: string
  push_aktiv: boolean
  push_token: string | null
  følger_hendelser: string[]
  push_prefs: {
    sentral_ids: string[]
    fylke_ids: string[]
    kategori_ids: string[]
    kun_pågående: boolean
  }
  sist_aktiv: string
}

const mockSubscriptions: UserSubscription[] = [
  {
    id: '1', fullt_navn: 'Frank Lunde', epost: 'frank.lunde1981@gmail.com', rolle: 'admin',
    push_aktiv: true, push_token: 'ExponentPushToken[abc123]',
    følger_hendelser: ['h-001', 'h-003', 'h-005', 'h-007', 'h-010'],
    push_prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: [], kun_pågående: false },
    sist_aktiv: '2025-01-30T23:45:00',
  },
  {
    id: '2', fullt_navn: 'Helge Lunde', epost: 'helge.lunde1981@gmail.com', rolle: 'admin',
    push_aktiv: true, push_token: 'ExponentPushToken[def456]',
    følger_hendelser: ['h-001', 'h-002', 'h-012'],
    push_prefs: { sentral_ids: ['s-vestland', 's-oslo'], fylke_ids: ['f-46', 'f-03'], kategori_ids: ['kat-brann-bygning', 'kat-brann-annet'], kun_pågående: true },
    sist_aktiv: '2025-01-30T22:10:00',
  },
  {
    id: '3', fullt_navn: 'Kari Operatør', epost: 'kari@bergen-brann.no', rolle: 'operator',
    push_aktiv: true, push_token: 'ExponentPushToken[ghi789]',
    følger_hendelser: ['h-001', 'h-005'],
    push_prefs: { sentral_ids: ['s-vestland'], fylke_ids: ['f-46'], kategori_ids: [], kun_pågående: false },
    sist_aktiv: '2025-01-30T20:30:00',
  },
  {
    id: '4', fullt_navn: 'Ole Vansen', epost: 'ole@oslo-brann.no', rolle: 'operator',
    push_aktiv: true, push_token: 'ExponentPushToken[jkl012]',
    følger_hendelser: ['h-002', 'h-004', 'h-006', 'h-008'],
    push_prefs: { sentral_ids: ['s-oslo', 's-ost'], fylke_ids: ['f-03', 'f-32', 'f-31'], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke', 'kat-ras-skred'], kun_pågående: true },
    sist_aktiv: '2025-01-30T21:15:00',
  },
  {
    id: '5', fullt_navn: 'Per Hansen', epost: 'per@tbrt.no', rolle: 'operator',
    push_aktiv: false, push_token: null,
    følger_hendelser: ['h-009'],
    push_prefs: { sentral_ids: ['s-trondelag'], fylke_ids: ['f-50'], kategori_ids: [], kun_pågående: false },
    sist_aktiv: '2025-01-29T14:00:00',
  },
  {
    id: '6', fullt_navn: 'Anna Journalist', epost: 'anna@nrk.no', rolle: 'presse',
    push_aktiv: true, push_token: 'ExponentPushToken[mno345]',
    følger_hendelser: ['h-001', 'h-002', 'h-003', 'h-005', 'h-007', 'h-010', 'h-011'],
    push_prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke', 'kat-ras-skred', 'kat-farlig-gods'], kun_pågående: false },
    sist_aktiv: '2025-01-30T23:50:00',
  },
  {
    id: '7', fullt_navn: 'Erik Redaktør', epost: 'erik@vg.no', rolle: 'presse',
    push_aktiv: true, push_token: 'ExponentPushToken[pqr678]',
    følger_hendelser: ['h-001', 'h-003', 'h-005'],
    push_prefs: { sentral_ids: ['s-oslo', 's-vestland', 's-trondelag'], fylke_ids: ['f-03', 'f-46', 'f-50'], kategori_ids: ['kat-brann-bygning'], kun_pågående: true },
    sist_aktiv: '2025-01-30T19:00:00',
  },
  {
    id: '8', fullt_navn: 'Lisa Eriksen', epost: 'lisa@kbr.no', rolle: 'operator',
    push_aktiv: false, push_token: null,
    følger_hendelser: [],
    push_prefs: { sentral_ids: ['s-agder'], fylke_ids: ['f-42'], kategori_ids: [], kun_pågående: false },
    sist_aktiv: '2025-01-20T10:00:00',
  },
  {
    id: '9', fullt_navn: 'Morten Nilsen', epost: 'morten@sorost110.no', rolle: '110-admin',
    push_aktiv: true, push_token: 'ExponentPushToken[stu901]',
    følger_hendelser: ['h-004', 'h-006'],
    push_prefs: { sentral_ids: ['s-sorost'], fylke_ids: ['f-39', 'f-40', 'f-33'], kategori_ids: ['kat-brann-bygning', 'kat-brann-annet', 'kat-pipebrann'], kun_pågående: false },
    sist_aktiv: '2025-01-30T18:30:00',
  },
  {
    id: '10', fullt_navn: 'Silje Berg', epost: 'silje@bt.no', rolle: 'presse',
    push_aktiv: true, push_token: 'ExponentPushToken[vwx234]',
    følger_hendelser: ['h-001', 'h-005', 'h-010', 'h-011', 'h-012'],
    push_prefs: { sentral_ids: ['s-vestland', 's-rogaland'], fylke_ids: ['f-46', 'f-11'], kategori_ids: [], kun_pågående: false },
    sist_aktiv: '2025-01-30T22:45:00',
  },
  {
    id: '11', fullt_navn: 'Thomas Vik', epost: 'thomas@dagbladet.no', rolle: 'presse',
    push_aktiv: false, push_token: null,
    følger_hendelser: ['h-002'],
    push_prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: [], kun_pågående: false },
    sist_aktiv: '2025-01-25T12:00:00',
  },
  {
    id: '12', fullt_navn: 'Maria Solheim', epost: 'maria@tv2.no', rolle: 'presse',
    push_aktiv: true, push_token: 'ExponentPushToken[yza567]',
    følger_hendelser: ['h-001', 'h-002', 'h-003', 'h-004', 'h-005', 'h-006', 'h-007', 'h-008'],
    push_prefs: { sentral_ids: [], fylke_ids: [], kategori_ids: ['kat-brann-bygning', 'kat-trafikkulykke', 'kat-ras-skred', 'kat-farlig-gods', 'kat-brann-annet'], kun_pågående: false },
    sist_aktiv: '2025-01-30T23:30:00',
  },
]

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminStatistikkPage() {
  const { isAdmin, is110Admin, isScoped, scope, filterSentraler } = useSentralScope()
  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null)
  const [filterPush, setFilterPush] = useState<string>('')

  // Scope subscriptions for 110-admin
  const scopedSubs = isScoped
    ? mockSubscriptions.filter(u => {
        if (u.rolle === 'admin') return false
        return u.push_prefs.sentral_ids.some(sId => scope.sentralIds.includes(sId)) || u.push_prefs.sentral_ids.length === 0
      })
    : mockSubscriptions

  const filteredSubs = scopedSubs.filter(u => {
    if (filterPush === 'aktiv' && !u.push_aktiv) return false
    if (filterPush === 'inaktiv' && u.push_aktiv) return false
    return true
  })

  // Stats
  const totalUsers = scopedSubs.length
  const pushAktive = scopedSubs.filter(u => u.push_aktiv).length
  const pushInaktive = scopedSubs.filter(u => !u.push_aktiv).length
  const totalFølger = scopedSubs.reduce((sum, u) => sum + u.følger_hendelser.length, 0)
  const kunPågående = scopedSubs.filter(u => u.push_prefs.kun_pågående).length

  // Sentral popularity
  const sentralCounts: Record<string, number> = {}
  scopedSubs.forEach(u => {
    u.push_prefs.sentral_ids.forEach(sId => {
      sentralCounts[sId] = (sentralCounts[sId] || 0) + 1
    })
  })
  const availableSentraler = isScoped ? filterSentraler(sentraler) : sentraler
  const sentralStats = availableSentraler
    .map(s => ({ ...s, count: sentralCounts[s.id] || 0 }))
    .sort((a, b) => b.count - a.count)

  // Fylke popularity
  const fylkeCounts: Record<string, number> = {}
  scopedSubs.forEach(u => {
    u.push_prefs.fylke_ids.forEach(fId => {
      fylkeCounts[fId] = (fylkeCounts[fId] || 0) + 1
    })
  })
  const fylkeStats = fylker
    .map(f => ({ ...f, count: fylkeCounts[f.id] || 0 }))
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count)

  // Kategori popularity
  const kategoriCounts: Record<string, number> = {}
  scopedSubs.forEach(u => {
    u.push_prefs.kategori_ids.forEach(kId => {
      kategoriCounts[kId] = (kategoriCounts[kId] || 0) + 1
    })
  })
  const kategoriStats = kategorier
    .map(k => ({ ...k, count: kategoriCounts[k.id] || 0 }))
    .filter(k => k.count > 0)
    .sort((a, b) => b.count - a.count)

  // Role distribution with push
  const rolleStats = [
    { label: 'Admin', count: scopedSubs.filter(u => u.rolle === 'admin').length, pushCount: scopedSubs.filter(u => u.rolle === 'admin' && u.push_aktiv).length, color: 'text-purple-400' },
    { label: '110-Admin', count: scopedSubs.filter(u => u.rolle === '110-admin').length, pushCount: scopedSubs.filter(u => u.rolle === '110-admin' && u.push_aktiv).length, color: 'text-orange-400' },
    { label: 'Operatør', count: scopedSubs.filter(u => u.rolle === 'operator').length, pushCount: scopedSubs.filter(u => u.rolle === 'operator' && u.push_aktiv).length, color: 'text-blue-400' },
    { label: 'Presse', count: scopedSubs.filter(u => u.rolle === 'presse').length, pushCount: scopedSubs.filter(u => u.rolle === 'presse' && u.push_aktiv).length, color: 'text-cyan-400' },
  ].filter(r => r.count > 0)

  const getRolleColor = (rolle: string) => {
    switch (rolle) {
      case 'admin': return 'bg-purple-500/20 text-purple-400'
      case '110-admin': return 'bg-orange-500/20 text-orange-400'
      case 'presse': return 'bg-cyan-500/20 text-cyan-400'
      default: return 'bg-blue-500/20 text-blue-400'
    }
  }

  const getRolleLabel = (rolle: string) => {
    switch (rolle) {
      case 'admin': return 'Admin'
      case '110-admin': return '110-Admin'
      case 'presse': return 'Presse'
      default: return 'Operatør'
    }
  }

  return (
    <DashboardLayout role={is110Admin ? '110-admin' : 'admin'}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Statistikk</h1>
          <p className="text-sm text-gray-400">
            {isScoped ? 'Abonnementer og push-varsler for dine sentraler' : 'Oversikt over abonnementer, push-varsler og brukeraktivitet'}
          </p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Totalt brukere</p>
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Push aktiv</p>
            <p className="text-2xl font-bold text-green-400">{pushAktive}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Push inaktiv</p>
            <p className="text-2xl font-bold text-red-400">{pushInaktive}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Følger (totalt)</p>
            <p className="text-2xl font-bold text-blue-400">{totalFølger}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4">
            <p className="text-xs text-gray-400">Kun pågående</p>
            <p className="text-2xl font-bold text-yellow-400">{kunPågående}</p>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Push per rolle */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Push-varsler per rolle</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              {rolleStats.map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className={`text-sm ${r.color}`}>{r.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0a0a0a] rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${r.count > 0 ? (r.pushCount / r.count) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{r.pushCount}/{r.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Populære 110-sentraler */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Abonnement per 110-sentral</h2>
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              {sentralStats.length > 0 ? sentralStats.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm text-white">{s.kort_navn}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[#0a0a0a] rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${totalUsers > 0 ? (s.count / totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{s.count} brukere</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Ingen abonnementer ennå</p>
              )}
            </div>
          </section>

          {/* Populære fylker */}
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
                        style={{ width: `${totalUsers > 0 ? (f.count / totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{f.count} brukere</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Ingen fylkefiltre satt</p>
              )}
            </div>
          </section>

          {/* Populære kategorier */}
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
                        style={{ width: `${totalUsers > 0 ? (k.count / totalUsers) * 100 : 0}%`, backgroundColor: k.farge }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{k.count} brukere</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500">Ingen kategorifiltre satt</p>
              )}
            </div>
          </section>
        </div>

        {/* User subscription table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Brukerabonnementer</h2>
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

          <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Bruker</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Rolle</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Push</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Følger</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden md:table-cell">Sentraler</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Kategorier</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium hidden lg:table-cell">Sist aktiv</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Detaljer</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.sort((a, b) => new Date(b.sist_aktiv).getTime() - new Date(a.sist_aktiv).getTime()).map((user) => {
                    const userSentraler = user.push_prefs.sentral_ids.map(sId => sentraler.find(s => s.id === sId)).filter(Boolean)
                    const userKategorier = user.push_prefs.kategori_ids.map(kId => kategorier.find(k => k.id === kId)).filter(Boolean)
                    return (
                      <tr key={user.id} className="border-b border-[#2a2a2a] hover:bg-[#222]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-xs text-white font-bold">{user.fullt_navn.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">{user.fullt_navn}</p>
                              <p className="text-xs text-gray-500 hidden md:block">{user.epost}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${getRolleColor(user.rolle)}`}>
                            {getRolleLabel(user.rolle)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${user.push_aktiv ? 'text-green-400' : 'text-red-400'}`}>
                            {user.push_aktiv ? 'Aktiv' : 'Av'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-white">{user.følger_hendelser.length}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {userSentraler.length > 0 ? userSentraler.slice(0, 2).map(s => (
                              <span key={s!.id} className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">{s!.kort_navn}</span>
                            )) : <span className="text-xs text-gray-600">Alle</span>}
                            {userSentraler.length > 2 && <span className="text-xs text-gray-500">+{userSentraler.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {userKategorier.length > 0 ? userKategorier.slice(0, 2).map(k => (
                              <span key={k!.id} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: k!.farge + '22', color: k!.farge }}>{k!.navn.split(' ')[0]}</span>
                            )) : <span className="text-xs text-gray-600">Alle</span>}
                            {userKategorier.length > 2 && <span className="text-xs text-gray-500">+{userKategorier.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-gray-400">{formatDateTime(user.sist_aktiv)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedUser(user)} className="text-xs text-blue-400 hover:text-blue-300">Vis</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#2a2a2a]">
              <p className="text-xs text-gray-500">Viser {filteredSubs.length} av {scopedSubs.length} brukere</p>
            </div>
          </div>
        </section>

        {/* User detail modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedUser(null)} />
            <div className="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">{selectedUser.fullt_navn}</h2>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">E-post</p>
                    <p className="text-sm text-white break-all">{selectedUser.epost}</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Rolle</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${getRolleColor(selectedUser.rolle)}`}>{getRolleLabel(selectedUser.rolle)}</span>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Push-varsler</p>
                    <p className={`text-sm font-medium ${selectedUser.push_aktiv ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedUser.push_aktiv ? 'Aktivert' : 'Deaktivert'}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Kun pågående</p>
                    <p className="text-sm text-white">{selectedUser.push_prefs.kun_pågående ? 'Ja' : 'Nei'}</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Følger hendelser</p>
                    <p className="text-sm text-white">{selectedUser.følger_hendelser.length} hendelser</p>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500">Sist aktiv</p>
                    <p className="text-sm text-white">{formatDateTime(selectedUser.sist_aktiv)}</p>
                  </div>
                </div>

                {/* Push token */}
                {selectedUser.push_token && (
                  <div className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Push-token</p>
                    <p className="text-xs text-gray-400 font-mono break-all">{selectedUser.push_token}</p>
                  </div>
                )}

                {/* Sentraler */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">110-sentraler abonnert på</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.push_prefs.sentral_ids.length > 0
                      ? selectedUser.push_prefs.sentral_ids.map(sId => {
                          const s = sentraler.find(x => x.id === sId)
                          return s ? <span key={sId} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{s.kort_navn}</span> : null
                        })
                      : <span className="text-xs text-gray-500">Alle sentraler (ingen filter)</span>
                    }
                  </div>
                </div>

                {/* Fylker */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Fylker abonnert på</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.push_prefs.fylke_ids.length > 0
                      ? selectedUser.push_prefs.fylke_ids.map(fId => {
                          const f = fylker.find(x => x.id === fId)
                          return f ? <span key={fId} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{f.navn}</span> : null
                        })
                      : <span className="text-xs text-gray-500">Alle fylker (ingen filter)</span>
                    }
                  </div>
                </div>

                {/* Kategorier */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Kategorier abonnert på</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.push_prefs.kategori_ids.length > 0
                      ? selectedUser.push_prefs.kategori_ids.map(kId => {
                          const k = kategorier.find(x => x.id === kId)
                          return k ? <span key={kId} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: k.farge + '22', color: k.farge }}>{k.navn}</span> : null
                        })
                      : <span className="text-xs text-gray-500">Alle kategorier (ingen filter)</span>
                    }
                  </div>
                </div>

                {/* Hendelser følges */}
                {selectedUser.følger_hendelser.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Hendelser som følges</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.følger_hendelser.map(hId => (
                        <span key={hId} className="text-xs bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded font-mono">{hId}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button onClick={() => setSelectedUser(null)} className="w-full py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">Lukk</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

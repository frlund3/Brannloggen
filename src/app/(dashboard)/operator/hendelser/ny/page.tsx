'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { fylker } from '@/data/fylker'
import { kommuner } from '@/data/kommuner'
import { kategorier } from '@/data/kategorier'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NyHendelsePage() {
  const router = useRouter()
  const [selectedFylke, setSelectedFylke] = useState('')
  const [formData, setFormData] = useState({
    tittel: '',
    beskrivelse: '',
    sted: '',
    kommune_id: '',
    fylke_id: '',
    kategori_id: '',
    alvorlighetsgrad: 'middels',
    latitude: '',
    longitude: '',
  })
  const [presseInfo, setPresseInfo] = useState('')
  const [internNotat, setInternNotat] = useState('')
  const [bilder, setBilder] = useState<File[]>([])
  const [bilderSynligPresse, setBilderSynligPresse] = useState(true)
  const [bilderSynligPublikum, setBilderSynligPublikum] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredKommuner = selectedFylke
    ? kommuner.filter((k) => k.fylke_id === selectedFylke)
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // In production, this would call the Supabase API
    // For now, simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000))

    alert('Hendelse opprettet! (Demo - ingen data lagret)')
    router.push('/operator/hendelser')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setBilder([...bilder, ...Array.from(e.target.files)])
    }
  }

  return (
    <DashboardLayout role="operator">
      <div className="p-4 lg:p-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Ny hendelse</h1>
          <p className="text-sm text-gray-400">Opprett en ny hendelse for publisering</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kategori *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {kategorier.map((kat) => (
                <button
                  key={kat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, kategori_id: kat.id })}
                  className={`px-3 py-2 rounded-lg text-xs text-left border transition-colors ${
                    formData.kategori_id === kat.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]'
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: kat.farge }} />
                  {kat.navn}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Alvorlighetsgrad *</label>
            <div className="flex gap-2">
              {[
                { value: 'lav', label: 'Lav', color: 'bg-green-500' },
                { value: 'middels', label: 'Middels', color: 'bg-yellow-500' },
                { value: 'høy', label: 'Høy', color: 'bg-orange-500' },
                { value: 'kritisk', label: 'Kritisk', color: 'bg-red-500' },
              ].map((sev) => (
                <button
                  key={sev.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, alvorlighetsgrad: sev.value })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    formData.alvorlighetsgrad === sev.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 hover:border-[#3a3a3a]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${sev.color}`} />
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tittel *</label>
            <input
              type="text"
              value={formData.tittel}
              onChange={(e) => setFormData({ ...formData, tittel: e.target.value })}
              placeholder="F.eks: Brann: Bergen, Sandviken"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fylke *</label>
              <select
                value={selectedFylke}
                onChange={(e) => {
                  setSelectedFylke(e.target.value)
                  setFormData({ ...formData, fylke_id: e.target.value, kommune_id: '' })
                }}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Velg fylke</option>
                {fylker.map((f) => (
                  <option key={f.id} value={f.id}>{f.navn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Kommune *</label>
              <select
                value={formData.kommune_id}
                onChange={(e) => setFormData({ ...formData, kommune_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
                disabled={!selectedFylke}
              >
                <option value="">Velg kommune</option>
                {filteredKommuner.map((k) => (
                  <option key={k.id} value={k.id}>{k.navn}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Stedsangivelse *</label>
            <input
              type="text"
              value={formData.sted}
              onChange={(e) => setFormData({ ...formData, sted: e.target.value })}
              placeholder="F.eks: Sandviksveien 42, Sandviken"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Breddegrad (valgfritt)</label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="60.4055"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Lengdegrad (valgfritt)</label>
              <input
                type="text"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="5.3275"
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Beskrivelse *</label>
            <textarea
              value={formData.beskrivelse}
              onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
              placeholder="Beskriv hendelsen..."
              rows={4}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bilder (valgfritt)</label>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">Klikk for å laste opp bilder</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG opp til 10MB</p>
              </label>
            </div>
            {bilder.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {bilder.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-[#1a1a1a] rounded px-2 py-1">
                    <span className="text-xs text-gray-400">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setBilder(bilder.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Image visibility options */}
            {bilder.length > 0 && (
              <div className="mt-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-400 font-medium mb-2">Bildesynlighet</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bilderSynligPresse}
                    onChange={(e) => setBilderSynligPresse(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-sm text-gray-300">Synlig for presse</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bilderSynligPublikum}
                    onChange={(e) => setBilderSynligPublikum(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-sm text-gray-300">Synlig for publikum</span>
                </label>
              </div>
            )}
          </div>

          {/* Press info */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <h3 className="text-sm font-semibold text-blue-400">Presseinformasjon</h3>
            </div>
            <p className="text-xs text-blue-400/70 mb-2">
              Ekstra detaljer kun synlig for akkreditert presse. Ikke synlig for publikum.
            </p>
            <textarea
              value={presseInfo}
              onChange={(e) => setPresseInfo(e.target.value)}
              placeholder="F.eks. kontaktperson, pressekonferanse tidspunkt, ekstra bakgrunn..."
              rows={3}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-blue-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* Internal note - SEPARATE */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-sm font-semibold text-yellow-400">Internt notat</h3>
            </div>
            <p className="text-xs text-yellow-400/70 mb-2">
              Notater her er kun synlig for operatører i ditt brannvesen. Lagres separat fra offentlig informasjon.
            </p>
            <textarea
              value={internNotat}
              onChange={(e) => setInternNotat(e.target.value)}
              placeholder="Skriv et internt notat..."
              rows={3}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-yellow-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Publiserer...' : 'Publiser hendelse'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operator/hendelser')}
              className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

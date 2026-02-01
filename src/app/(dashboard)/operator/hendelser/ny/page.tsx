'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useFylker, useBrannvesen, useKategorier, useSentraler, useKommuner } from '@/hooks/useSupabaseData'
import { invalidateCache } from '@/hooks/useSupabaseData'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'

export default function NyHendelsePage() {
  const router = useRouter()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: brannvesen, loading: brannvesenLoading } = useBrannvesen()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { data: kommuner, loading: kommunerLoading } = useKommuner()
  const [selectedSentral, setSelectedSentral] = useState('')
  const [selectedFylke, setSelectedFylke] = useState('')
  const [formData, setFormData] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return {
      tittel: '',
      beskrivelse: '',
      sted: '',
      sentral_id: '',
      brannvesen_id: '',
      kommune_id: '',
      fylke_id: '',
      kategori_id: '',
      alvorlighetsgrad: 'middels',
      latitude: '',
      longitude: '',
      postnummer: '',
      poststed: '',
      starttidspunkt: now.toISOString().slice(0, 16),
    }
  })
  const [presseInfo, setPresseInfo] = useState('')
  const [internNotat, setInternNotat] = useState('')

  // Image state - separate for each section
  const [publikumBilde, setPublikumBilde] = useState<File | null>(null)
  const [presseBilde, setPresseBilde] = useState<File | null>(null)
  const [internBilde, setInternBilde] = useState<File | null>(null)
  const publikumBildeRef = useRef<HTMLInputElement>(null)
  const presseBildeRef = useRef<HTMLInputElement>(null)
  const internBildeRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [kategoriSearch, setKategoriSearch] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressWrapperRef = useRef<HTMLDivElement>(null)

  const filteredKategorier = useMemo(() => {
    if (!kategoriSearch) return kategorier
    const q = kategoriSearch.toLowerCase()
    return kategorier.filter(k => k.navn.toLowerCase().includes(q))
  }, [kategorier, kategoriSearch])

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([])
      return
    }
    try {
      const kommune = formData.kommune_id ? kommuner.find(k => k.id === formData.kommune_id) : null
      const kommuneParam = kommune ? `&kommunenavn=${encodeURIComponent(kommune.navn)}` : ''
      const res = await fetch(`https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}${kommuneParam}&fuzzy=true&treffPerSide=5`)
      const data = await res.json()
      if (data.adresser) {
        setAddressSuggestions(data.adresser)
        setShowSuggestions(true)
      }
    } catch {
      // ignore
    }
  }, [formData.kommune_id, kommuner])

  const handleAddressChange = (value: string) => {
    setFormData({ ...formData, sted: value })
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current)
    addressDebounceRef.current = setTimeout(() => searchAddress(value), 300)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectAddress = (addr: any) => {
    const matchedKommune = kommuner.find(k => {
      const kNum = k.id.replace('k-', '')
      const addrNum = addr.kommunenummer?.replace(/^0+/, '') || ''
      return kNum === addrNum || kNum === addr.kommunenummer
    })
    const matchedFylke = matchedKommune ? fylker.find(f => f.id === matchedKommune.fylke_id) : null

    setFormData(prev => ({
      ...prev,
      sted: addr.adressetekst,
      latitude: String(addr.representasjonspunkt.lat),
      longitude: String(addr.representasjonspunkt.lon),
      kommune_id: matchedKommune?.id || prev.kommune_id,
      fylke_id: matchedFylke?.id || prev.fylke_id,
      postnummer: addr.postnummer || '',
      poststed: addr.poststed || '',
    }))
    if (matchedFylke) setSelectedFylke(matchedFylke.id)
    setShowSuggestions(false)
    setAddressSuggestions([])
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleGeocode = async () => {
    if (!formData.sted) {
      toast.error('Fyll inn stedsangivelse først')
      return
    }
    setGeocoding(true)
    try {
      const kommune = formData.kommune_id ? kommuner.find(k => k.id === formData.kommune_id) : null
      const query = kommune ? `${formData.sted}, ${kommune.navn}` : formData.sted
      const res = await fetch(`https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&fuzzy=true&treffPerSide=1`)
      const data = await res.json()
      if (data.adresser && data.adresser.length > 0) {
        const addr = data.adresser[0]
        setFormData(prev => ({
          ...prev,
          latitude: String(addr.representasjonspunkt.lat),
          longitude: String(addr.representasjonspunkt.lon),
        }))
        toast.success(`Koordinater hentet fra: ${addr.adressetekst}`)
      } else {
        toast.error('Fant ingen treff på adressen')
      }
    } catch {
      toast.error('Kunne ikke hente koordinater')
    } finally {
      setGeocoding(false)
    }
  }

  const uploadImage = async (file: File, hendelseId: string): Promise<string | null> => {
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${hendelseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('hendelsesbilder').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('hendelsesbilder').getPublicUrl(fileName)
      return publicUrl
    } catch (err) {
      console.error('Image upload error:', err)
      return null
    }
  }

  const isLoading = fylkerLoading || brannvesenLoading || kategorierLoading || sentralerLoading || kommunerLoading
  if (isLoading) return <div className="p-8 text-center text-gray-400">Laster...</div>

  const sentral = selectedSentral ? sentraler.find(s => s.id === selectedSentral) : null

  const filteredFylker = sentral
    ? fylker.filter(f => sentral.fylke_ids.includes(f.id))
    : fylker

  const filteredBrannvesen = (() => {
    let list = brannvesen
    if (sentral) {
      list = list.filter(b => sentral.brannvesen_ids.includes(b.id))
    }
    if (selectedFylke) {
      list = list.filter(b => b.fylke_id === selectedFylke)
    }
    return list.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no'))
  })()

  const filteredKommuner = selectedFylke ? kommuner.filter(k => k.fylke_id === selectedFylke) : kommuner

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.tittel || !formData.beskrivelse || !formData.sted || !formData.sentral_id || !formData.fylke_id || !formData.brannvesen_id || !formData.kategori_id || !formData.kommune_id) {
      toast.error('Fyll ut alle påkrevde felter')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Du må være innlogget'); setSaving(false); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: hendelse, error } = await (supabase.from('hendelser') as any).insert({
        tittel: formData.tittel,
        beskrivelse: formData.beskrivelse,
        sted: formData.sted,
        brannvesen_id: formData.brannvesen_id,
        kommune_id: formData.kommune_id,
        fylke_id: formData.fylke_id,
        kategori_id: formData.kategori_id,
        alvorlighetsgrad: formData.alvorlighetsgrad,
        opprettet_av: user.id,
        opprettet_tidspunkt: formData.starttidspunkt ? new Date(formData.starttidspunkt).toISOString() : new Date().toISOString(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        postnummer: formData.postnummer || null,
        poststed: formData.poststed || null,
        presse_tekst: presseInfo || null,
      }).select().single()

      if (error) throw error

      // Upload hendelse-bilde directly on hendelsen
      if (publikumBilde && hendelse) {
        const bildeUrl = await uploadImage(publikumBilde, hendelse.id)
        if (bildeUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('hendelser') as any).update({ bilde_url: bildeUrl }).eq('id', hendelse.id)
        }
      }

      // Upload presse-bilde as presseoppdatering
      if (presseBilde && hendelse) {
        const bildeUrl = await uploadImage(presseBilde, hendelse.id)
        if (bildeUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('presseoppdateringer') as any).insert({
            hendelse_id: hendelse.id,
            tekst: 'Bilde fra hendelsen',
            opprettet_av: user.id,
            bilde_url: bildeUrl,
          })
        }
      }

      // Save internal note with optional image
      if ((internNotat || internBilde) && hendelse) {
        let bildeUrl: string | null = null
        if (internBilde) {
          bildeUrl = await uploadImage(internBilde, hendelse.id)
        }
        if (internNotat || bildeUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('interne_notater') as any).insert({
            hendelse_id: hendelse.id,
            notat: internNotat || 'Bilde vedlagt',
            opprettet_av: user.id,
            bilde_url: bildeUrl,
          })
        }
      }

      invalidateCache()
      if (hendelse) {
        logActivity({ handling: 'opprettet', tabell: 'hendelser', radId: hendelse.id, hendelseId: hendelse.id, hendelseTittel: formData.tittel })
        if (publikumBilde) logActivity({ handling: 'bilde_lastet_opp', tabell: 'hendelser', radId: hendelse.id, hendelseId: hendelse.id, hendelseTittel: formData.tittel })
        if (presseInfo) logActivity({ handling: 'ny_pressemelding', tabell: 'hendelser', hendelseId: hendelse.id, hendelseTittel: formData.tittel })
        if (internNotat || internBilde) logActivity({ handling: 'ny_notat', tabell: 'interne_notater', hendelseId: hendelse.id, hendelseTittel: formData.tittel })
      }
      toast.success('Hendelse opprettet!')
      router.push('/operator/hendelser')
    } catch (err) {
      toast.error('Kunne ikke opprette hendelse: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setSaving(false)
    }
  }

  const ImageUploadButton = ({ file, onSelect, onClear, inputRef, label }: {
    file: File | null
    onSelect: (f: File) => void
    onClear: () => void
    inputRef: React.RefObject<HTMLInputElement | null>
    label: string
  }) => (
    <div className="flex items-center gap-2 mt-2">
      <input type="file" ref={inputRef} accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onSelect(e.target.files[0]) }} />
      <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        {file ? file.name : label}
      </button>
      {file && (
        <button type="button" onClick={onClear} className="text-xs text-red-400 hover:text-red-300">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  )

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
            <input
              type="text"
              value={kategoriSearch}
              onChange={(e) => setKategoriSearch(e.target.value)}
              placeholder="Søk kategori..."
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 mb-2"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto overflow-x-hidden relative">
              {filteredKategorier.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((kat) => (
                <button
                  key={kat.id}
                  type="button"
                  onClick={() => { setFormData({ ...formData, kategori_id: kat.id }); setKategoriSearch('') }}
                  className={`px-3 py-2 rounded-lg text-xs text-left border transition-colors inline-flex items-center gap-1.5 ${
                    formData.kategori_id === kat.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]'
                  }`}
                >
                  <span className="shrink-0" style={{ color: kat.farge }}>
                    <CategoryIcon iconName={kat.ikon} className="w-3.5 h-3.5" />
                  </span>
                  {kat.navn}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Alvorlighetsgrad *</label>
            <div className="grid grid-cols-2 sm:flex gap-2">
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
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm border transition-colors touch-manipulation ${
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

          {/* Start time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Starttidspunkt</label>
            <p className="text-xs text-gray-500 mb-2">Forhåndsutfylt med nåværende tid. Endre om hendelsen startet tidligere.</p>
            <input
              type="datetime-local"
              value={formData.starttidspunkt}
              onChange={(e) => setFormData({ ...formData, starttidspunkt: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
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

          {/* 110-sentral */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">110-sentral *</label>
            <select
              value={selectedSentral}
              onChange={(e) => {
                setSelectedSentral(e.target.value)
                setSelectedFylke('')
                setFormData({ ...formData, sentral_id: e.target.value, fylke_id: '', brannvesen_id: '' })
              }}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Velg 110-sentral</option>
              {sentraler.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map((s) => (
                <option key={s.id} value={s.id}>{s.kort_navn}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fylke *</label>
              <select
                value={selectedFylke}
                onChange={(e) => {
                  setSelectedFylke(e.target.value)
                  setFormData({ ...formData, fylke_id: e.target.value, brannvesen_id: '' })
                }}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Velg fylke</option>
                {filteredFylker.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((f) => (
                  <option key={f.id} value={f.id}>{f.navn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Brannvesen *</label>
              <select
                value={formData.brannvesen_id}
                onChange={(e) => setFormData({ ...formData, brannvesen_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Velg brannvesen</option>
                {filteredBrannvesen.map((b) => (
                  <option key={b.id} value={b.id}>{b.kort_navn}</option>
                ))}
              </select>
            </div>
          </div>

          <div ref={addressWrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">Stedsangivelse *</label>
            <input
              type="text"
              value={formData.sted}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true) }}
              placeholder="F.eks: Sandviksveien 42, Sandviken"
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              autoComplete="off"
              required
            />
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden shadow-xl">
                {addressSuggestions.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectAddress(addr)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#222] transition-colors border-b border-[#2a2a2a] last:border-b-0"
                  >
                    <p className="text-sm text-white">{addr.adressetekst}</p>
                    <p className="text-xs text-gray-500">{addr.kommunenavn}, {addr.fylkesnavn}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kommune *</label>
            <select
              value={formData.kommune_id}
              onChange={(e) => setFormData({ ...formData, kommune_id: e.target.value })}
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Velg kommune</option>
              {filteredKommuner.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map((k) => (
                <option key={k.id} value={k.id}>{k.navn}</option>
              ))}
            </select>
          </div>

          {/* Coordinates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Koordinater (valgfritt)</label>
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !formData.sted}
                className="text-xs px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {geocoding ? 'Henter...' : 'Hent fra adresse'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Breddegrad</label>
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="60.4055"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lengdegrad</label>
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="5.3275"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
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

          {/* Hendelsebilde */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <h3 className="text-sm font-semibold text-gray-300">Hendelsebilde</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">Hovedbilde for hendelsen. Synlig for alle.</p>
            <ImageUploadButton
              file={publikumBilde}
              onSelect={setPublikumBilde}
              onClear={() => setPublikumBilde(null)}
              inputRef={publikumBildeRef}
              label="Legg til hendelsebilde"
            />
          </div>

          {/* Press info */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <h3 className="text-sm font-semibold text-cyan-400">Pressemelding</h3>
            </div>
            <p className="text-xs text-cyan-400/70 mb-2">
              Kun synlig for akkreditert presse. Ikke synlig for publikum.
            </p>
            <textarea
              value={presseInfo}
              onChange={(e) => setPresseInfo(e.target.value)}
              placeholder="F.eks. kontaktperson, pressekonferanse tidspunkt, ekstra bakgrunn..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-cyan-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
            />
            <ImageUploadButton
              file={presseBilde}
              onSelect={setPresseBilde}
              onClear={() => setPresseBilde(null)}
              inputRef={presseBildeRef}
              label="Legg til bilde (kun for presse)"
            />
          </div>

          {/* Internal note */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-sm font-semibold text-yellow-400">Internt notat</h3>
            </div>
            <p className="text-xs text-yellow-400/70 mb-2">
              Kun synlig for operatører. Lagres separat fra offentlig informasjon.
            </p>
            <textarea
              value={internNotat}
              onChange={(e) => setInternNotat(e.target.value)}
              placeholder="Skriv et internt notat..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-yellow-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
            />
            <ImageUploadButton
              file={internBilde}
              onSelect={setInternBilde}
              onClear={() => setInternBilde(null)}
              inputRef={internBildeRef}
              label="Legg til bilde (kun internt)"
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
            >
              {saving ? 'Publiserer...' : 'Publiser hendelse'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operator/hendelser')}
              className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white transition-colors touch-manipulation"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

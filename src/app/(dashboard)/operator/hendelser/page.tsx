'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SeverityDot } from '@/components/ui/SeverityDot'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useHendelser, useBrannvesen, useKategorier, useFylker, useKommuner, useSentraler, useBrukerprofiler } from '@/hooks/useSupabaseData'
import { invalidateCache } from '@/hooks/useSupabaseData'
import { useRealtimeHendelser } from '@/hooks/useRealtimeHendelser'
import { formatDateTime, formatTime, formatTimeAgo, formatDuration } from '@/lib/utils'
import { useSentralScope } from '@/hooks/useSentralScope'
import Link from 'next/link'
import { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'
import { validateImageFileFull } from '@/lib/file-validation'

export default function OperatorHendelserPage() {
  const { data: allHendelser, loading: hendelserLoading, refetch } = useHendelser({ excludeDeactivated: true })
  useRealtimeHendelser(refetch)
  const { data: brannvesen, loading: brannvesenLoading } = useBrannvesen()
  const { data: kategorier, loading: kategorierLoading } = useKategorier()
  const { data: fylker, loading: fylkerLoading } = useFylker()
  const { data: kommuner, loading: kommunerLoading } = useKommuner()
  const { data: sentraler, loading: sentralerLoading } = useSentraler()
  const { data: brukerprofiler } = useBrukerprofiler()
  const { isAdmin, is110Admin, isScoped, hasAdminAccess, filterByBrannvesen } = useSentralScope()

  const getUserName = (userId: string) => {
    const profil = brukerprofiler.find(b => b.user_id === userId)
    return profil?.fullt_navn || null
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterFylke, setFilterFylke] = useState('')
  const [filterKommune, setFilterKommune] = useState('')
  const [filterBrannvesen, setFilterBrannvesen] = useState('')
  const [filterSentral, setFilterSentral] = useState('')
  const [filterAlvor, setFilterAlvor] = useState('')
  const [deactivatedIds, setDeactivatedIds] = useState<string[]>([])
  const [deactivateConfirm, setDeactivateConfirm] = useState<string | null>(null)
  const [avsluttConfirm, setAvsluttConfirm] = useState<string | null>(null)
  const [avsluttTidspunkt, setAvsluttTidspunkt] = useState('')
  const [quickUpdateId, setQuickUpdateId] = useState<string | null>(null)
  const [quickUpdateText, setQuickUpdateText] = useState('')
  const [quickUpdateType, setQuickUpdateType] = useState<'publikum' | 'presse' | 'intern'>('publikum')
  const [quickUpdateImage, setQuickUpdateImage] = useState<File | null>(null)
  const quickUpdateImageRef = useRef<HTMLInputElement>(null)
  const [quickUpdateSaving, setQuickUpdateSaving] = useState(false)

  // Expand/collapse row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Edit modal state
  const [selectedHendelse, setSelectedHendelse] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editTittel, setEditTittel] = useState('')
  const [editBeskrivelse, setEditBeskrivelse] = useState('')
  const [editSted, setEditSted] = useState('')
  const [editKategoriId, setEditKategoriId] = useState('')
  const [editAlvor, setEditAlvor] = useState('')
  const [editBrannvesenId, setEditBrannvesenId] = useState('')
  const [editSentralId, setEditSentralId] = useState('')
  const [editPressetekst, setEditPressetekst] = useState('')
  const [editStartTidspunkt, setEditStartTidspunkt] = useState('')
  const [editAvsluttetTidspunkt, setEditAvsluttetTidspunkt] = useState('')
  const [showAvsluttetDialog, setShowAvsluttetDialog] = useState(false)

  // Editing existing items
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null)
  const [editUpdateText, setEditUpdateText] = useState('')
  const [editingPresseId, setEditingPresseId] = useState<string | null>(null)
  const [editPresseText, setEditPresseText] = useState('')
  const [editingNotatId, setEditingNotatId] = useState<string | null>(null)
  const [editNotatText, setEditNotatText] = useState('')

  // New items
  const [newUpdate, setNewUpdate] = useState('')
  const [newPresse, setNewPresse] = useState('')
  const [newNotat, setNewNotat] = useState('')

  // Image state
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const hendelseBildeRef = useRef<HTMLInputElement>(null)
  const updateImageRef = useRef<HTMLInputElement>(null)
  const presseImageRef = useRef<HTMLInputElement>(null)
  const notatImageRef = useRef<HTMLInputElement>(null)
  const [newHendelseBilde, setNewHendelseBilde] = useState<File | null>(null)
  const [newUpdateImage, setNewUpdateImage] = useState<File | null>(null)
  const [newPresseImage, setNewPresseImage] = useState<File | null>(null)
  const [newNotatImage, setNewNotatImage] = useState<File | null>(null)

  // Scope hendelser for 110-admin
  const scopedHendelser = useMemo(() => {
    return isScoped ? filterByBrannvesen(allHendelser) : allHendelser
  }, [isScoped, filterByBrannvesen, allHendelser])

  const uploadImage = useCallback(async (file: File, hendelseId: string): Promise<string | null> => {
    try {
      // Validate file before upload
      const validation = await validateImageFileFull(file)
      if (!validation.valid) {
        toast.error(validation.error || 'Ugyldig fil')
        return null
      }

      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase()
      const fileName = `${hendelseId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('hendelsesbilder').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('hendelsesbilder').getPublicUrl(fileName)
      return publicUrl
    } catch (err) {
      toast.error('Kunne ikke laste opp bilde: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
      return null
    }
  }, [])

  // Edit image state for inline editing (must be before early return)
  const [editItemImage, setEditItemImage] = useState<File | null>(null)
  const [removeEditItemImage, setRemoveEditItemImage] = useState(false)
  const editItemImageRef = useRef<HTMLInputElement>(null)

  const isLoading = hendelserLoading || brannvesenLoading || kategorierLoading || fylkerLoading || kommunerLoading || sentralerLoading
  if (isLoading) return <div className="p-8 text-center text-theme-secondary">Laster...</div>

  const filteredKommuner = filterFylke ? kommuner.filter(k => k.fylke_id === filterFylke) : kommuner
  const filteredBrannvesenList = filterSentral
    ? brannvesen.filter(b => sentraler.find(s => s.id === filterSentral)?.brannvesen_ids.includes(b.id))
    : filterFylke
    ? brannvesen.filter(b => b.fylke_id === filterFylke)
    : brannvesen

  const hendelser = scopedHendelser
    .filter((h) => {
      if (deactivatedIds.includes(h.id)) return false
      if (statusFilter !== 'alle' && h.status !== statusFilter) return false
      if (search && !h.tittel.toLowerCase().includes(search.toLowerCase()) && !h.sted.toLowerCase().includes(search.toLowerCase())) return false
      if (filterKategori && h.kategori_id !== filterKategori) return false
      if (filterFylke && h.fylke_id !== filterFylke) return false
      if (filterKommune && h.kommune_id !== filterKommune) return false
      if (filterBrannvesen && h.brannvesen_id !== filterBrannvesen) return false
      if (filterAlvor && h.alvorlighetsgrad !== filterAlvor) return false
      if (filterSentral) {
        const sentral = sentraler.find(s => s.id === filterSentral)
        if (sentral && !sentral.brannvesen_ids.includes(h.brannvesen_id)) return false
      }
      return true
    })
    .sort((a, b) => new Date(b.opprettet_tidspunkt).getTime() - new Date(a.opprettet_tidspunkt).getTime())

  const activeFilterCount = [filterKategori, filterFylke, filterKommune, filterBrannvesen, filterSentral, filterAlvor].filter(Boolean).length

  const clearFilters = () => {
    setSearch(''); setFilterKategori(''); setFilterFylke(''); setFilterKommune(''); setFilterBrannvesen(''); setFilterSentral(''); setFilterAlvor('')
  }

  // ── Handlers ──

  const handleDeactivate = async (id: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelser') as any).update({ status: 'deaktivert' }).eq('id', id)
      if (error) throw error
      const h = allHendelser.find(x => x.id === id)
      logActivity({ handling: 'deaktivert', tabell: 'hendelser', radId: id, hendelseId: id, hendelseTittel: h?.tittel })
      setDeactivatedIds([...deactivatedIds, id])
      setDeactivateConfirm(null)
      invalidateCache()
      toast.success('Hendelse deaktivert')
    } catch (err) {
      toast.error('Kunne ikke deaktivere: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
      setDeactivateConfirm(null)
    }
  }

  const handleAvslutt = async (id: string) => {
    if (!avsluttTidspunkt) {
      toast.error('Du må velge avslutningstidspunkt')
      return
    }
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelser') as any).update({
        status: 'avsluttet',
        avsluttet_tidspunkt: new Date(avsluttTidspunkt).toISOString(),
        oppdatert_tidspunkt: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
      const h = allHendelser.find(x => x.id === id)
      logActivity({ handling: 'avsluttet', tabell: 'hendelser', radId: id, hendelseId: id, hendelseTittel: h?.tittel })
      setAvsluttConfirm(null)
      setAvsluttTidspunkt('')
      invalidateCache()
      refetch()
      toast.success('Hendelse avsluttet')
    } catch (err) {
      toast.error('Kunne ikke avslutte: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    }
  }

  const handleQuickUpdate = async (hendelseId: string) => {
    if (!quickUpdateText.trim()) return
    setQuickUpdateSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Du må være innlogget'); return }

      let bildeUrl: string | null = null
      if (quickUpdateImage) {
        bildeUrl = await uploadImage(quickUpdateImage, hendelseId)
      }

      const tableMap = { publikum: 'hendelsesoppdateringer', presse: 'presseoppdateringer', intern: 'interne_notater' } as const
      const table = tableMap[quickUpdateType]
      const textField = quickUpdateType === 'intern' ? 'notat' : 'tekst'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(table) as any).insert({
        hendelse_id: hendelseId, [textField]: quickUpdateText, opprettet_av: user.id, bilde_url: bildeUrl,
      })
      if (error) throw error
      const h = allHendelser.find(x => x.id === hendelseId)
      const handlingMap = { publikum: 'ny_oppdatering', presse: 'ny_pressemelding', intern: 'ny_notat' } as const
      const tabellMap = { publikum: 'hendelsesoppdateringer', presse: 'presseoppdateringer', intern: 'interne_notater' } as const
      logActivity({ handling: handlingMap[quickUpdateType], tabell: tabellMap[quickUpdateType], hendelseId, hendelseTittel: h?.tittel, detaljer: { tekst: quickUpdateText.slice(0, 100) } })
      setQuickUpdateId(null)
      setQuickUpdateText('')
      setQuickUpdateType('publikum')
      setQuickUpdateImage(null)
      invalidateCache()
      refetch()
      const labelMap = { publikum: 'Oppdatering', presse: 'Pressemelding', intern: 'Notat' }
      toast.success(`${labelMap[quickUpdateType]} lagt til`)
    } catch (err) {
      toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setQuickUpdateSaving(false)
    }
  }

  const openHendelse = (id: string) => {
    const h = allHendelser.find(x => x.id === id)
    if (!h) return
    setSelectedHendelse(id)
    setEditStatus(h.status)
    setEditTittel(h.tittel)
    setEditBeskrivelse(h.beskrivelse)
    setEditSted(h.sted)
    setEditKategoriId(h.kategori_id)
    setEditAlvor(h.alvorlighetsgrad)
    setEditBrannvesenId(h.brannvesen_id)
    const matchedSentral = sentraler.find(s => s.brannvesen_ids.includes(h.brannvesen_id))
    setEditSentralId(matchedSentral?.id || '')
    setEditPressetekst(h.presse_tekst || '')
    // Set time fields - convert ISO to datetime-local format
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      return d.toISOString().slice(0, 16)
    }
    setEditStartTidspunkt(toLocal(h.opprettet_tidspunkt))
    setEditAvsluttetTidspunkt(h.avsluttet_tidspunkt ? toLocal(h.avsluttet_tidspunkt) : '')
    setShowAvsluttetDialog(false)
    setNewUpdate(''); setNewPresse(''); setNewNotat('')
    setNewUpdateImage(null); setNewPresseImage(null); setNewNotatImage(null); setNewHendelseBilde(null)
    setEditingUpdateId(null); setEditingPresseId(null); setEditingNotatId(null)
    resetEditImageState()
  }

  // Inline image edit controls (used in both collapse and modal editing)
  const ImageEditControls = ({ currentUrl, accentColor }: { currentUrl: string | null; accentColor: string }) => (
    <div className="mt-2">
      {currentUrl && !removeEditItemImage && !editItemImage && (
        <div className="relative inline-block mb-2">
          <img src={currentUrl} alt="" className="rounded-lg max-h-32 object-cover" />
          <button onClick={() => setRemoveEditItemImage(true)} className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 rounded-full text-white transition-colors" title="Fjern bilde">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {removeEditItemImage && (
        <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
          Bilde fjernes ved lagring
          <button onClick={() => setRemoveEditItemImage(false)} className="text-theme-secondary hover:text-theme underline ml-1">Angre</button>
        </p>
      )}
      <div className="flex items-center gap-2">
        <input type="file" ref={editItemImageRef} accept="image/*" className="hidden" onChange={(e) => { setEditItemImage(e.target.files?.[0] || null); setRemoveEditItemImage(false) }} />
        <button onClick={() => editItemImageRef.current?.click()} className={`flex items-center gap-1 text-xs text-${accentColor}-400 hover:text-${accentColor}-300`}>
          <ImageIcon /> {editItemImage ? editItemImage.name : currentUrl ? 'Bytt bilde' : 'Legg til bilde'}
        </button>
        {editItemImage && <button onClick={() => setEditItemImage(null)} className="text-xs text-red-400">Fjern valgt</button>}
      </div>
    </div>
  )

  const handleSaveChanges = async () => {
    if (!selectedH) return
    if (editStatus === 'avsluttet' && !editAvsluttetTidspunkt) {
      toast.error('Du må fylle inn avslutningstidspunkt')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Du må være innlogget'); return }

      // Update hendelse fields
      const updateData: Record<string, unknown> = {}
      if (editStatus !== selectedH.status) {
        updateData.status = editStatus
        if (editStatus === 'avsluttet' && editAvsluttetTidspunkt) {
          updateData.avsluttet_tidspunkt = new Date(editAvsluttetTidspunkt).toISOString()
        } else if (editStatus === 'pågår') {
          updateData.avsluttet_tidspunkt = null
        }
      }
      // Check if start time changed
      if (editStartTidspunkt) {
        const newStart = new Date(editStartTidspunkt).toISOString()
        if (newStart !== selectedH.opprettet_tidspunkt) {
          updateData.opprettet_tidspunkt = newStart
        }
      }
      // Check if end time changed (for already-avsluttet hendelser)
      if (editStatus === 'avsluttet' && editAvsluttetTidspunkt && selectedH.status === 'avsluttet') {
        const newEnd = new Date(editAvsluttetTidspunkt).toISOString()
        if (newEnd !== selectedH.avsluttet_tidspunkt) {
          updateData.avsluttet_tidspunkt = newEnd
        }
      }
      if (editTittel !== selectedH.tittel) updateData.tittel = editTittel
      if (editBeskrivelse !== selectedH.beskrivelse) updateData.beskrivelse = editBeskrivelse
      if (editSted !== selectedH.sted) updateData.sted = editSted
      if (editKategoriId !== selectedH.kategori_id) updateData.kategori_id = editKategoriId
      if (editAlvor !== selectedH.alvorlighetsgrad) updateData.alvorlighetsgrad = editAlvor
      if (editBrannvesenId !== selectedH.brannvesen_id) updateData.brannvesen_id = editBrannvesenId
      if (editPressetekst !== (selectedH.presse_tekst || '')) updateData.presse_tekst = editPressetekst || null

      // Upload hendelse bilde if changed
      if (newHendelseBilde) {
        setUploadingImage(true)
        const bildeUrl = await uploadImage(newHendelseBilde, selectedH.id)
        if (bildeUrl) updateData.bilde_url = bildeUrl
      }

      if (Object.keys(updateData).length > 0) {
        updateData.oppdatert_tidspunkt = new Date().toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('hendelser') as any).update(updateData).eq('id', selectedH.id)
        if (error) throw error
        const changedFields = Object.keys(updateData).filter(k => k !== 'oppdatert_tidspunkt')
        if (changedFields.includes('bilde_url') && newHendelseBilde) {
          logActivity({ handling: 'bilde_lastet_opp', tabell: 'hendelser', radId: selectedH.id, hendelseId: selectedH.id, hendelseTittel: selectedH.tittel })
        }
        if (updateData.status === 'avsluttet') {
          logActivity({ handling: 'avsluttet', tabell: 'hendelser', radId: selectedH.id, hendelseId: selectedH.id, hendelseTittel: selectedH.tittel })
        } else if (updateData.status === 'pågår' && selectedH.status === 'avsluttet') {
          logActivity({ handling: 'gjenåpnet', tabell: 'hendelser', radId: selectedH.id, hendelseId: selectedH.id, hendelseTittel: selectedH.tittel })
        }
        const editFields = changedFields.filter(k => k !== 'status' && k !== 'bilde_url')
        if (editFields.length > 0) {
          logActivity({ handling: 'redigert', tabell: 'hendelser', radId: selectedH.id, hendelseId: selectedH.id, hendelseTittel: selectedH.tittel, detaljer: { endrede_felt: editFields } })
        }
      }

      // Add new oppdatering
      if (newUpdate.trim()) {
        let bildeUrl: string | null = null
        if (newUpdateImage) {
          setUploadingImage(true)
          bildeUrl = await uploadImage(newUpdateImage, selectedH.id)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('hendelsesoppdateringer') as any).insert({
          hendelse_id: selectedH.id, tekst: newUpdate, opprettet_av: user.id, bilde_url: bildeUrl,
        })
        if (error) throw error
        logActivity({ handling: 'ny_oppdatering', tabell: 'hendelsesoppdateringer', hendelseId: selectedH.id, hendelseTittel: selectedH.tittel, detaljer: { tekst: newUpdate.slice(0, 100) } })
      }

      // Add new presseoppdatering
      if (newPresse.trim()) {
        let bildeUrl: string | null = null
        if (newPresseImage) {
          setUploadingImage(true)
          bildeUrl = await uploadImage(newPresseImage, selectedH.id)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('presseoppdateringer') as any).insert({
          hendelse_id: selectedH.id, tekst: newPresse, opprettet_av: user.id, bilde_url: bildeUrl,
        })
        if (error) throw error
        logActivity({ handling: 'ny_pressemelding', tabell: 'presseoppdateringer', hendelseId: selectedH.id, hendelseTittel: selectedH.tittel, detaljer: { tekst: newPresse.slice(0, 100) } })
      }

      // Add new intern notat
      if (newNotat.trim()) {
        let bildeUrl: string | null = null
        if (newNotatImage) {
          setUploadingImage(true)
          bildeUrl = await uploadImage(newNotatImage, selectedH.id)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('interne_notater') as any).insert({
          hendelse_id: selectedH.id, notat: newNotat, opprettet_av: user.id, bilde_url: bildeUrl,
        })
        if (error) throw error
        logActivity({ handling: 'ny_notat', tabell: 'interne_notater', hendelseId: selectedH.id, hendelseTittel: selectedH.tittel, detaljer: { tekst: newNotat.slice(0, 100) } })
      }

      invalidateCache()
      refetch()
      toast.success('Endringer lagret')
      setSelectedHendelse(null)
    } catch (err) {
      toast.error('Kunne ikke lagre: ' + (err instanceof Error ? err.message : 'Ukjent feil'))
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  const resetEditImageState = () => {
    setEditItemImage(null)
    setRemoveEditItemImage(false)
  }

  // Edit handlers for each type
  const handleUpdateEdit = async (updateId: string, hendelseId: string) => {
    if (!editUpdateText.trim()) return
    try {
      const supabase = createClient()
      const updatePayload: Record<string, unknown> = { tekst: editUpdateText }
      if (removeEditItemImage) {
        updatePayload.bilde_url = null
      } else if (editItemImage) {
        setUploadingImage(true)
        const url = await uploadImage(editItemImage, hendelseId)
        if (url) updatePayload.bilde_url = url
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelsesoppdateringer') as any).update(updatePayload).eq('id', updateId)
      if (error) throw error
      const parentH = allHendelser.find(x => x.id === hendelseId)
      logActivity({ handling: 'redigert_oppdatering', tabell: 'hendelsesoppdateringer', radId: updateId, hendelseId, hendelseTittel: parentH?.tittel })
      setEditingUpdateId(null); resetEditImageState(); invalidateCache(); refetch(); toast.success('Oppdatering redigert')
    } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
    finally { setUploadingImage(false) }
  }

  const handlePresseEdit = async (presseId: string, hendelseId: string) => {
    if (!editPresseText.trim()) return
    try {
      const supabase = createClient()
      const updatePayload: Record<string, unknown> = { tekst: editPresseText }
      if (removeEditItemImage) {
        updatePayload.bilde_url = null
      } else if (editItemImage) {
        setUploadingImage(true)
        const url = await uploadImage(editItemImage, hendelseId)
        if (url) updatePayload.bilde_url = url
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('presseoppdateringer') as any).update(updatePayload).eq('id', presseId)
      if (error) throw error
      const parentH = allHendelser.find(x => x.id === hendelseId)
      logActivity({ handling: 'redigert_pressemelding', tabell: 'presseoppdateringer', radId: presseId, hendelseId, hendelseTittel: parentH?.tittel })
      setEditingPresseId(null); resetEditImageState(); invalidateCache(); refetch(); toast.success('Pressemelding redigert')
    } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
    finally { setUploadingImage(false) }
  }

  const handleNotatEdit = async (notatId: string, hendelseId: string) => {
    if (!editNotatText.trim()) return
    try {
      const supabase = createClient()
      const updatePayload: Record<string, unknown> = { notat: editNotatText }
      if (removeEditItemImage) {
        updatePayload.bilde_url = null
      } else if (editItemImage) {
        setUploadingImage(true)
        const url = await uploadImage(editItemImage, hendelseId)
        if (url) updatePayload.bilde_url = url
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('interne_notater') as any).update(updatePayload).eq('id', notatId)
      if (error) throw error
      const parentH = allHendelser.find(x => x.id === hendelseId)
      logActivity({ handling: 'redigert_notat', tabell: 'interne_notater', radId: notatId, hendelseId, hendelseTittel: parentH?.tittel })
      setEditingNotatId(null); resetEditImageState(); invalidateCache(); refetch(); toast.success('Notat redigert')
    } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
    finally { setUploadingImage(false) }
  }

  // Deactivate handlers
  const handleDeactivateUpdate = async (id: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('hendelsesoppdateringer') as any).update({ deaktivert: true }).eq('id', id)
      if (error) throw error
      logActivity({ handling: 'deaktivert_oppdatering', tabell: 'hendelsesoppdateringer', radId: id })
      invalidateCache(); refetch(); toast.success('Oppdatering deaktivert')
    } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
  }

  const handleDeactivatePresse = async (id: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('presseoppdateringer') as any).update({ deaktivert: true }).eq('id', id)
      if (error) throw error
      logActivity({ handling: 'deaktivert_pressemelding', tabell: 'presseoppdateringer', radId: id })
      invalidateCache(); refetch(); toast.success('Pressemelding deaktivert')
    } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
  }

  const handleDeactivateNotat = async (id: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('interne_notater') as any).update({ deaktivert: true }).eq('id', id)
      if (error) throw error
      logActivity({ handling: 'deaktivert_notat', tabell: 'interne_notater', radId: id })
      invalidateCache(); refetch(); toast.success('Notat deaktivert')
    } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
  }

  const selectedH = selectedHendelse ? allHendelser.find(h => h.id === selectedHendelse) : null
  const layoutRole = isAdmin ? 'admin' as const : is110Admin ? '110-admin' as const : 'operator' as const

  // Icon components for reuse
  const EditIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  )
  const DeactivateIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
  )
  const ImageIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )
  const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  )

  return (
    <DashboardLayout role={layoutRole}>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-theme">Hendelser</h1>
          <p className="text-sm text-theme-secondary mb-3">
            {isScoped ? 'Hendelser for dine 110-sentraler' : 'Administrer hendelser'}
          </p>
          <Link href="/operator/hendelser/ny" className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ny hendelse
          </Link>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'alle', label: 'Alle' },
            { value: 'pågår', label: 'Pågår' },
            { value: 'avsluttet', label: 'Avsluttet' },
          ].map((tab) => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${statusFilter === tab.value ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-theme-card text-theme-secondary border border-theme hover:text-theme'}`}>
              {tab.label}
              <span className="ml-1.5 text-xs">({tab.value === 'alle' ? scopedHendelser.filter(h => !deactivatedIds.includes(h.id)).length : scopedHendelser.filter((h) => h.status === tab.value && !deactivatedIds.includes(h.id)).length})</span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk på tittel eller sted..." className="w-full px-4 py-2 bg-theme-card border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="px-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-theme text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle kategorier</option>
              {kategorier.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
            </select>
            <select value={filterAlvor} onChange={(e) => setFilterAlvor(e.target.value)} className="px-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-theme text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle alvorlighetsgrader</option>
              <option value="lav">Lav</option>
              <option value="middels">Middels</option>
              <option value="høy">Høy</option>
              <option value="kritisk">Kritisk</option>
            </select>
            <select value={filterSentral} onChange={(e) => setFilterSentral(e.target.value)} className="px-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-theme text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle 110-sentraler</option>
              {sentraler.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
            </select>
            <select value={filterFylke} onChange={(e) => { setFilterFylke(e.target.value); setFilterKommune(''); setFilterBrannvesen('') }} className="px-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-theme text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle fylker</option>
              {fylker.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(f => <option key={f.id} value={f.id}>{f.navn}</option>)}
            </select>
            {filterFylke && (
              <select value={filterKommune} onChange={(e) => setFilterKommune(e.target.value)} className="px-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-theme text-xs focus:outline-none focus:border-blue-500">
                <option value="">Alle kommuner</option>
                {filteredKommuner.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
              </select>
            )}
            <select value={filterBrannvesen} onChange={(e) => setFilterBrannvesen(e.target.value)} className="px-3 py-2.5 bg-theme-card border border-theme-input rounded-lg text-theme text-xs focus:outline-none focus:border-blue-500">
              <option value="">Alle brannvesen</option>
              {filteredBrannvesenList.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="px-3 py-2.5 text-xs text-red-400 hover:text-red-300 touch-manipulation">Nullstill filtre ({activeFilterCount})</button>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {hendelser.map((h) => {
            const sentral = sentraler.find((s) => s.brannvesen_ids.includes(h.brannvesen_id))
            const bv = brannvesen.find((b) => b.id === h.brannvesen_id)
            const kat = kategorier.find((k) => k.id === h.kategori_id)
            const updCount = h.oppdateringer?.filter(u => !u.deaktivert).length || 0
            const presseCount = h.presseoppdateringer?.filter(p => !p.deaktivert).length || 0
            const notatCount = h.interne_notater?.filter(n => !n.deaktivert).length || 0
            const isExpanded = expandedId === h.id
            const hasPresse = !!h.presse_tekst || presseCount > 0

            const statusStripeColor = h.status === 'pågår' ? 'bg-red-500' : 'bg-gray-600'
            const durationStripeColor = h.status === 'pågår' ? 'bg-amber-500' : 'bg-emerald-600'
            const statusLabel = h.status === 'pågår' ? 'PÅGÅR' : 'AVSLUTTET'

            return (
              <div key={h.id} className="bg-theme-card rounded-xl border border-theme overflow-hidden transition-all shadow-sm hover:shadow-md flex">
                {/* Status color stripe with vertical text */}
                <div className={`w-7 shrink-0 ${statusStripeColor} flex items-center justify-center`}>
                  <span className="text-[10px] font-bold text-white tracking-widest [writing-mode:vertical-lr] rotate-180 select-none">
                    {statusLabel}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                {/* Card header - clickable */}
                <div
                  className="p-4 cursor-pointer hover:bg-theme-card-hover transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : h.id)}
                >
                  {/* Top row: status + severity + duration + time */}
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={h.status} size="sm" />
                    <SeverityDot severity={h.alvorlighetsgrad} showLabel />
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${h.status === 'avsluttet' ? 'bg-gray-500/10 text-theme-muted' : 'bg-amber-500/10 text-amber-400'}`}>
                      {formatDuration(h.opprettet_tidspunkt, h.avsluttet_tidspunkt)}
                    </span>
                    <span className="text-xs text-theme-muted ml-auto">{formatTimeAgo(h.opprettet_tidspunkt)}</span>
                    <ChevronIcon open={isExpanded} />
                  </div>

                  {/* Title + location */}
                  <h3 className="text-base font-semibold text-theme mb-1">{h.tittel}</h3>
                  <p className="text-xs text-theme-secondary mb-3">{h.sted}</p>

                  {/* Info chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {kat && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: kat.farge + '18', color: kat.farge }}>
                        <CategoryIcon iconName={kat.ikon} className="w-3 h-3" />{kat.navn}
                      </span>
                    )}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-500/10 text-theme-secondary">
                      {sentral?.kort_navn || bv?.kort_navn}
                    </span>
                    {updCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                        {updCount} oppd.
                      </span>
                    )}
                    {hasPresse && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                        {presseCount > 0 ? presseCount : '1'} presse
                      </span>
                    )}
                    {notatCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                        {notatCount} notat
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-theme flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openHendelse(h.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg text-xs font-medium transition-colors touch-manipulation">
                      <EditIcon /> Rediger
                    </button>
                    <button onClick={() => { setQuickUpdateId(quickUpdateId === h.id ? null : h.id); setQuickUpdateText(''); setQuickUpdateType('publikum'); setQuickUpdateImage(null) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors touch-manipulation">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Ny melding
                    </button>
                    {h.status === 'pågår' && (
                      <button onClick={() => {
                        const now = new Date()
                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                        setAvsluttTidspunkt(now.toISOString().slice(0, 16))
                        setAvsluttConfirm(h.id)
                      }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/20 rounded-lg text-xs font-medium transition-colors touch-manipulation">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Avslutt
                      </button>
                    )}
                    {hasAdminAccess && (
                      <button onClick={() => setDeactivateConfirm(h.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-medium transition-colors touch-manipulation">
                        <DeactivateIcon /> Deaktiver
                      </button>
                    )}
                    <span className="text-xs text-theme-dim ml-auto">{formatDateTime(h.opprettet_tidspunkt)}</span>
                  </div>

                  {/* Quick update inline */}
                  {quickUpdateId === h.id && (
                    <div className="mt-3 pt-3 border-t border-theme" onClick={(e) => e.stopPropagation()}>
                      {/* Type selector */}
                      <div className="flex gap-1.5 mb-3">
                        {([
                          { value: 'publikum' as const, label: 'Publikum', desc: 'Synlig for alle', color: 'blue' },
                          { value: 'presse' as const, label: 'Presse', desc: 'Kun presse', color: 'cyan' },
                          { value: 'intern' as const, label: 'Internt', desc: 'Kun operatører', color: 'yellow' },
                        ]).map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setQuickUpdateType(t.value)}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors border ${
                              quickUpdateType === t.value
                                ? t.color === 'blue' ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                                : t.color === 'cyan' ? 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'
                                : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'
                                : 'bg-theme text-theme-secondary border-theme hover:text-theme'
                            }`}
                          >
                            <div>{t.label}</div>
                            <div className="text-[10px] font-normal opacity-70">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={quickUpdateText}
                        onChange={(e) => setQuickUpdateText(e.target.value)}
                        placeholder={quickUpdateType === 'publikum' ? 'Skriv en oppdatering (synlig for alle)...' : quickUpdateType === 'presse' ? 'Skriv en pressemelding (kun synlig for presse)...' : 'Skriv et internt notat (kun synlig for operatører)...'}
                        className={`w-full px-3 py-2 bg-theme-input border rounded-lg text-theme text-sm focus:outline-none h-16 resize-none ${
                          quickUpdateType === 'publikum' ? 'border-blue-500/30 focus:border-blue-500'
                          : quickUpdateType === 'presse' ? 'border-cyan-500/30 focus:border-cyan-500'
                          : 'border-yellow-500/30 focus:border-yellow-500'
                        }`}
                        autoFocus
                      />
                      <div className="flex items-center gap-3 mt-2">
                        <input type="file" ref={quickUpdateImageRef} accept="image/*" className="hidden" onChange={(e) => setQuickUpdateImage(e.target.files?.[0] || null)} />
                        <button onClick={() => quickUpdateImageRef.current?.click()} className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme">
                          <ImageIcon />
                          {quickUpdateImage ? quickUpdateImage.name : 'Legg til bilde'}
                        </button>
                        {quickUpdateImage && <button onClick={() => setQuickUpdateImage(null)} className="text-xs text-red-400">Fjern</button>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleQuickUpdate(h.id)}
                          disabled={quickUpdateSaving || !quickUpdateText.trim()}
                          className={`px-4 py-1.5 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            quickUpdateType === 'publikum' ? 'bg-blue-500 hover:bg-blue-600'
                            : quickUpdateType === 'presse' ? 'bg-cyan-600 hover:bg-cyan-700'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                          }`}
                        >
                          {quickUpdateSaving ? 'Lagrer...' : quickUpdateType === 'publikum' ? 'Publiser oppdatering' : quickUpdateType === 'presse' ? 'Publiser pressemelding' : 'Lagre notat'}
                        </button>
                        <button onClick={() => { setQuickUpdateId(null); setQuickUpdateText(''); setQuickUpdateImage(null) }} className="px-3 py-1.5 text-theme-secondary text-xs hover:text-theme">Avbryt</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (() => {
                  const activeUpd = h.oppdateringer?.filter(u => !u.deaktivert) || []
                  const activePrs = h.presseoppdateringer?.filter(p => !p.deaktivert) || []
                  const activeNot = h.interne_notater?.filter(n => !n.deaktivert) || []

                  type TimelineItem = {
                    id: string
                    type: 'publikum' | 'presse' | 'intern' | 'status'
                    tekst: string
                    opprettet_tidspunkt: string
                    opprettet_av?: string
                    bilde_url?: string | null
                  }

                  const timeline: TimelineItem[] = [
                    ...activeUpd.map(u => ({ id: u.id, type: 'publikum' as const, tekst: u.tekst, opprettet_tidspunkt: u.opprettet_tidspunkt, opprettet_av: u.opprettet_av, bilde_url: u.bilde_url })),
                    ...activePrs.map(p => ({ id: p.id, type: 'presse' as const, tekst: p.tekst, opprettet_tidspunkt: p.opprettet_tidspunkt, opprettet_av: p.opprettet_av, bilde_url: p.bilde_url })),
                    ...activeNot.map(n => ({ id: n.id, type: 'intern' as const, tekst: n.notat, opprettet_tidspunkt: n.opprettet_tidspunkt, opprettet_av: n.opprettet_av, bilde_url: n.bilde_url })),
                  ]

                  if (h.status === 'avsluttet' && h.avsluttet_tidspunkt) {
                    timeline.push({ id: 'status-avsluttet', type: 'status', tekst: 'Hendelsen ble avsluttet', opprettet_tidspunkt: h.avsluttet_tidspunkt })
                  }
                  timeline.unshift({ id: 'opprettet', type: 'status', tekst: 'Hendelsen ble opprettet', opprettet_tidspunkt: h.opprettet_tidspunkt, opprettet_av: h.opprettet_av })
                  timeline.sort((a, b) => new Date(a.opprettet_tidspunkt).getTime() - new Date(b.opprettet_tidspunkt).getTime())

                  const typeConfig = {
                    publikum: { color: 'blue', label: 'Publikum', border: 'border-blue-500', line: 'bg-blue-500/30', badge: 'bg-blue-500/15 text-blue-400' },
                    presse: { color: 'cyan', label: 'Kun presse', border: 'border-cyan-500', line: 'bg-cyan-500/30', badge: 'bg-cyan-500/20 text-cyan-400' },
                    intern: { color: 'yellow', label: 'Internt', border: 'border-yellow-500', line: 'bg-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400' },
                    status: { color: 'gray', label: 'Status', border: 'border-gray-500', line: 'bg-gray-500/30', badge: 'bg-gray-500/20 text-theme-secondary' },
                  }

                  return (
                    <div className="border-t border-theme bg-theme-sidebar p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      {/* Hendelse bilde */}
                      {h.bilde_url && (
                        <div>
                          <h4 className="text-xs font-semibold text-theme-secondary mb-2 flex items-center gap-1.5">
                            <ImageIcon /> Hendelsebilde
                          </h4>
                          <img src={h.bilde_url} alt="" className="rounded-lg max-h-48 object-cover" />
                        </div>
                      )}
                      {/* Beskrivelse */}
                      <div>
                        <p className="text-sm text-theme-secondary">{h.beskrivelse}</p>
                        <p className="text-xs text-theme-muted mt-1">
                          Sted: {h.sted} &middot; Opprettet: {formatDateTime(h.opprettet_tidspunkt)}
                          {getUserName(h.opprettet_av) && <> &middot; Av: {getUserName(h.opprettet_av)}</>}
                          &middot; Sist oppdatert: {formatTimeAgo(h.oppdatert_tidspunkt)}
                        </p>
                      </div>

                      {/* Hovedpressemelding */}
                      {h.presse_tekst && (
                        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[10px] text-cyan-600 uppercase font-semibold">Hovedpressemelding</p>
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold">KUN PRESSE</span>
                              </div>
                              <p className="text-sm text-theme-secondary whitespace-pre-line">{h.presse_tekst}</p>
                            </div>
                            <button onClick={() => openHendelse(h.id)} className="p-1 text-theme-muted hover:text-cyan-400 shrink-0" title="Rediger pressemelding"><EditIcon /></button>
                          </div>
                        </div>
                      )}

                      {/* ── Unified Timeline ── */}
                      {timeline.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Tidslinje
                          </h4>
                          <div className="relative ml-1">
                            {timeline.map((item, i) => {
                              const cfg = typeConfig[item.type]
                              const isStatusItem = item.type === 'status'
                              const isEditingThis = (item.type === 'publikum' && editingUpdateId === item.id) ||
                                (item.type === 'presse' && editingPresseId === item.id) ||
                                (item.type === 'intern' && editingNotatId === item.id)

                              return (
                                <div key={item.id} className="relative pl-5 pb-4 last:pb-0">
                                  {i < timeline.length - 1 && (
                                    <div className={`absolute left-[5px] top-[10px] bottom-0 w-px ${typeConfig[timeline[i + 1].type].line}`} />
                                  )}
                                  <div className={`absolute left-0 top-[6px] w-[11px] h-[11px] rounded-full border-2 ${cfg.border} bg-theme-sidebar`} />

                                  {isStatusItem ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-theme-muted">{formatTime(item.opprettet_tidspunkt)}</span>
                                      <span className="text-xs text-theme-secondary italic">{item.tekst}</span>
                                      {item.opprettet_av && getUserName(item.opprettet_av) && (
                                        <span className="text-xs text-theme-dim">Av: {getUserName(item.opprettet_av)}</span>
                                      )}
                                    </div>
                                  ) : isEditingThis ? (
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-theme-muted">{formatTime(item.opprettet_tidspunkt)}</span>
                                        <span className={`text-[10px] ${cfg.badge} px-1.5 py-0.5 rounded font-bold`}>{cfg.label}</span>
                                      </div>
                                      <textarea
                                        value={item.type === 'publikum' ? editUpdateText : item.type === 'presse' ? editPresseText : editNotatText}
                                        onChange={(e) => item.type === 'publikum' ? setEditUpdateText(e.target.value) : item.type === 'presse' ? setEditPresseText(e.target.value) : setEditNotatText(e.target.value)}
                                        className={`w-full px-2 py-1.5 bg-theme-input border border-${cfg.color}-500/50 rounded text-theme text-sm focus:outline-none h-16 resize-none`}
                                      />
                                      <ImageEditControls currentUrl={item.bilde_url || null} accentColor={cfg.color} />
                                      <div className="flex gap-2 mt-2">
                                        <button
                                          onClick={() => item.type === 'publikum' ? handleUpdateEdit(item.id, h.id) : item.type === 'presse' ? handlePresseEdit(item.id, h.id) : handleNotatEdit(item.id, h.id)}
                                          className={`px-3 py-1 bg-${cfg.color}-500 text-white rounded text-xs`}
                                        >Lagre</button>
                                        <button onClick={() => { item.type === 'publikum' ? setEditingUpdateId(null) : item.type === 'presse' ? setEditingPresseId(null) : setEditingNotatId(null); resetEditImageState() }} className="px-3 py-1 text-theme-secondary text-xs">Avbryt</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-theme-muted">{formatTime(item.opprettet_tidspunkt)}</span>
                                        <span className={`text-[10px] ${cfg.badge} px-1.5 py-0.5 rounded font-bold`}>{cfg.label}</span>
                                        {item.opprettet_av && getUserName(item.opprettet_av) && (
                                          <span className="text-xs text-theme-dim">Av: {getUserName(item.opprettet_av)}</span>
                                        )}
                                        <div className="flex items-center gap-1 ml-auto shrink-0">
                                          <button
                                            onClick={() => {
                                              resetEditImageState()
                                              if (item.type === 'publikum') { setEditingUpdateId(item.id); setEditUpdateText(item.tekst) }
                                              else if (item.type === 'presse') { setEditingPresseId(item.id); setEditPresseText(item.tekst) }
                                              else { setEditingNotatId(item.id); setEditNotatText(item.tekst) }
                                            }}
                                            className={`p-1 text-theme-muted hover:text-${cfg.color}-400`}
                                            title="Rediger"
                                          ><EditIcon /></button>
                                          <button
                                            onClick={() => item.type === 'publikum' ? handleDeactivateUpdate(item.id) : item.type === 'presse' ? handleDeactivatePresse(item.id) : handleDeactivateNotat(item.id)}
                                            className="p-1 text-theme-muted hover:text-red-400"
                                            title="Deaktiver"
                                          ><DeactivateIcon /></button>
                                        </div>
                                      </div>
                                      <p className={`text-sm mt-0.5 ${item.type === 'presse' ? 'text-cyan-300' : item.type === 'intern' ? 'text-yellow-300' : 'text-theme-secondary'}`}>{item.tekst}</p>
                                      {item.bilde_url && (
                                        <img src={item.bilde_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quick action */}
                      <button
                        onClick={() => openHendelse(h.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <EditIcon /> Åpne full redigeringsvisning
                      </button>
                    </div>
                  )
                })()}
                </div>
                {/* Duration color stripe with vertical text */}
                <div className={`w-7 shrink-0 ${durationStripeColor} flex items-center justify-center`}>
                  <span className="text-[10px] font-bold text-white tracking-widest [writing-mode:vertical-lr] rotate-180 select-none">
                    {formatDuration(h.opprettet_tidspunkt, h.avsluttet_tidspunkt)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {hendelser.length === 0 && (
          <div className="bg-theme-card rounded-xl border border-theme p-8 text-center text-theme-muted text-sm">
            {search || activeFilterCount > 0 ? 'Ingen hendelser matcher filteret' : 'Ingen hendelser registrert'}
          </div>
        )}

        <div className="mt-3 text-center">
          <p className="text-xs text-theme-muted">Viser {hendelser.length} av {scopedHendelser.filter(h => !deactivatedIds.includes(h.id)).length} hendelser</p>
        </div>
      </div>

      {/* Deactivate confirm modal */}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-theme-overlay" onClick={() => setDeactivateConfirm(null)} />
          <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-theme mb-2">Deaktiver hendelse?</h2>
            <p className="text-sm text-theme-secondary mb-2">{allHendelser.find(h => h.id === deactivateConfirm)?.tittel}</p>
            <p className="text-xs text-theme-muted mb-6">Hendelsen vil bli skjult fra oversikten.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeactivate(deactivateConfirm)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">Deaktiver</button>
              <button onClick={() => setDeactivateConfirm(null)} className="px-4 py-2.5 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Avslutt hendelse confirm modal */}
      {avsluttConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-theme-overlay" onClick={() => { setAvsluttConfirm(null); setAvsluttTidspunkt('') }} />
          <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-sm mx-4 shadow-xl">
            <h2 className="text-lg font-bold text-theme mb-2">Avslutt hendelse?</h2>
            <p className="text-sm text-theme-secondary mb-1">{allHendelser.find(h => h.id === avsluttConfirm)?.tittel}</p>
            <p className="text-xs text-theme-muted mb-4">Hendelsen vil bli markert som avsluttet.</p>
            <div className="mb-4">
              <label className="block text-xs text-green-600 mb-1 font-semibold">Avslutningstidspunkt *</label>
              <input
                type="datetime-local"
                value={avsluttTidspunkt}
                onChange={(e) => setAvsluttTidspunkt(e.target.value)}
                className="w-full px-3 py-2 bg-theme-input border border-green-500/30 rounded-lg text-theme text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleAvslutt(avsluttConfirm)} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">Avslutt hendelse</button>
              <button onClick={() => { setAvsluttConfirm(null); setAvsluttTidspunkt('') }} className="px-4 py-2.5 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors">Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {selectedH && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-theme-overlay" onClick={() => setSelectedHendelse(null)} />
          <div className="relative bg-theme-card rounded-xl border border-theme p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-theme">Rediger hendelse</h2>
              <button onClick={() => setSelectedHendelse(null)} className="text-theme-secondary hover:text-theme">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* ── Basic fields ── */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-theme-muted mb-1">Tittel</label>
                <input type="text" value={editTittel} onChange={(e) => setEditTittel(e.target.value)} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-theme-muted mb-1">Beskrivelse</label>
                <textarea value={editBeskrivelse} onChange={(e) => setEditBeskrivelse(e.target.value)} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500 h-20 resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Sted</label>
                  <input type="text" value={editSted} onChange={(e) => setEditSted(e.target.value)} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Status</label>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditStatus('pågår'); setEditAvsluttetTidspunkt(''); setShowAvsluttetDialog(false) }} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${editStatus === 'pågår' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-theme text-theme-secondary border border-theme'}`}>
                      Pågår
                    </button>
                    <button onClick={() => {
                      if (editStatus !== 'avsluttet') {
                        const now = new Date()
                        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
                        setEditAvsluttetTidspunkt(now.toISOString().slice(0, 16))
                        setShowAvsluttetDialog(true)
                      }
                      setEditStatus('avsluttet')
                    }} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${editStatus === 'avsluttet' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-theme text-theme-secondary border border-theme'}`}>
                      Avsluttet
                    </button>
                  </div>
                  {showAvsluttetDialog && (
                    <div className="mt-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <label className="block text-xs text-green-400 mb-1 font-semibold">Tidspunkt for avslutning *</label>
                      <p className="text-xs text-theme-muted mb-2">Sett klokkeslett for når hendelsen ble avsluttet.</p>
                      <input
                        type="datetime-local"
                        value={editAvsluttetTidspunkt}
                        onChange={(e) => setEditAvsluttetTidspunkt(e.target.value)}
                        className="w-full px-3 py-2 bg-theme-input border border-green-500/30 rounded-lg text-theme text-sm focus:outline-none focus:border-green-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Kategori</label>
                  <select value={editKategoriId} onChange={(e) => setEditKategoriId(e.target.value)} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
                    {kategorier.sort((a, b) => a.navn.localeCompare(b.navn, 'no')).map(k => <option key={k.id} value={k.id}>{k.navn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Alvorlighetsgrad</label>
                  <select value={editAlvor} onChange={(e) => setEditAlvor(e.target.value)} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
                    <option value="lav">Lav</option><option value="middels">Middels</option><option value="høy">Høy</option><option value="kritisk">Kritisk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">110-sentral</label>
                  <select value={editSentralId} onChange={(e) => { setEditSentralId(e.target.value); setEditBrannvesenId('') }} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Velg 110-sentral</option>
                    {sentraler.sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(s => <option key={s.id} value={s.id}>{s.kort_navn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Brannvesen</label>
                  <select value={editBrannvesenId} onChange={(e) => setEditBrannvesenId(e.target.value)} className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Velg brannvesen</option>
                    {(editSentralId ? brannvesen.filter(b => sentraler.find(s => s.id === editSentralId)?.brannvesen_ids.includes(b.id)) : brannvesen).sort((a, b) => a.kort_navn.localeCompare(b.kort_navn, 'no')).map(b => <option key={b.id} value={b.id}>{b.kort_navn}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ══════════ Tidspunkter ══════════ */}
            <div className="border-t border-theme pt-4 mb-4">
              <h3 className="text-sm font-semibold text-theme-secondary mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Tidspunkter
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Starttidspunkt</label>
                  <input
                    type="datetime-local"
                    value={editStartTidspunkt}
                    onChange={(e) => setEditStartTidspunkt(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-theme-muted mb-1">Avslutningstidspunkt</label>
                  {editStatus === 'avsluttet' ? (
                    <input
                      type="datetime-local"
                      value={editAvsluttetTidspunkt}
                      onChange={(e) => setEditAvsluttetTidspunkt(e.target.value)}
                      className="w-full px-3 py-2 bg-theme-input border border-green-500/30 rounded-lg text-theme text-sm focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="px-3 py-2 text-sm text-theme-dim italic">Hendelsen pågår fortsatt</p>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════ Hendelsebilde ══════════ */}
            <div className="border-t border-theme pt-4 mb-4">
              <h3 className="text-sm font-semibold text-theme-secondary mb-3 flex items-center gap-2">
                <ImageIcon />
                Hendelsebilde
                <span className="text-xs text-theme-muted font-normal">Synlig for alle</span>
              </h3>
              {selectedH.bilde_url && !newHendelseBilde && (
                <div className="mb-3 relative inline-block">
                  <img src={selectedH.bilde_url} alt="" className="rounded-lg max-h-48 object-cover" />
                  <button
                    onClick={async () => {
                      try {
                        const supabase = createClient()
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const { error } = await (supabase.from('hendelser') as any).update({ bilde_url: null, oppdatert_tidspunkt: new Date().toISOString() }).eq('id', selectedH.id)
                        if (error) throw error
                        logActivity({ handling: 'bilde_fjernet', tabell: 'hendelser', radId: selectedH.id, hendelseId: selectedH.id, hendelseTittel: selectedH.tittel })
                        invalidateCache(); refetch(); toast.success('Bilde fjernet')
                      } catch (err) { toast.error('Feil: ' + (err instanceof Error ? err.message : 'Ukjent feil')) }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 rounded-full text-white transition-colors"
                    title="Fjern bilde"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <input type="file" ref={hendelseBildeRef} accept="image/*" className="hidden" onChange={(e) => setNewHendelseBilde(e.target.files?.[0] || null)} />
                <button onClick={() => hendelseBildeRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-theme border border-theme rounded-lg text-xs text-theme-secondary hover:text-theme transition-colors">
                  <ImageIcon />
                  {newHendelseBilde ? newHendelseBilde.name : selectedH.bilde_url ? 'Bytt bilde' : 'Legg til bilde'}
                </button>
                {newHendelseBilde && <button onClick={() => setNewHendelseBilde(null)} className="text-xs text-red-400">Fjern valgt</button>}
              </div>
            </div>

            {/* ══════════ SECTION 1: Oppdateringer (public) ══════════ */}
            <div className="border-t border-theme pt-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Oppdateringer ({selectedH.oppdateringer?.filter(u => !u.deaktivert).length || 0})
                <span className="text-xs text-theme-muted font-normal">Synlig for alle</span>
              </h3>

              {(selectedH.oppdateringer?.length ?? 0) > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedH.oppdateringer?.map(u => (
                    <div key={u.id} className={`rounded-lg p-3 ${u.deaktivert ? 'bg-theme-card-inner opacity-40' : 'bg-theme-card-inner'}`}>
                      {u.deaktivert ? (
                        <p className="text-xs text-theme-dim italic">Deaktivert oppdatering</p>
                      ) : editingUpdateId === u.id ? (
                        <div>
                          <textarea value={editUpdateText} onChange={(e) => setEditUpdateText(e.target.value)} className="w-full px-2 py-1.5 bg-theme-sidebar border border-blue-500/50 rounded text-theme text-sm focus:outline-none h-16 resize-none" />
                          <ImageEditControls currentUrl={u.bilde_url} accentColor="blue" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleUpdateEdit(u.id, selectedH.id)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs">Lagre</button>
                            <button onClick={() => { setEditingUpdateId(null); resetEditImageState() }} className="px-3 py-1 text-theme-secondary text-xs">Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-theme-secondary">{u.tekst}</p>
                            {u.bilde_url && <img src={u.bilde_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
                            <p className="text-xs text-theme-muted mt-1">
                              {formatDateTime(u.opprettet_tidspunkt)}
                              {getUserName(u.opprettet_av) && <> &middot; Av: {getUserName(u.opprettet_av)}</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setEditingUpdateId(u.id); setEditUpdateText(u.tekst); resetEditImageState() }} className="p-1 text-theme-muted hover:text-blue-400" title="Rediger"><EditIcon /></button>
                            <button onClick={() => handleDeactivateUpdate(u.id)} className="p-1 text-theme-muted hover:text-red-400" title="Deaktiver"><DeactivateIcon /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs text-theme-muted">Ny oppdatering</label>
                <textarea value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="Skriv en oppdatering (synlig for alle)..." className="w-full px-3 py-2 bg-theme-input border border-theme-input rounded-lg text-theme text-sm focus:outline-none focus:border-blue-500 h-16 resize-none" />
                <div className="flex items-center gap-3">
                  <input type="file" ref={updateImageRef} accept="image/*" className="hidden" onChange={(e) => setNewUpdateImage(e.target.files?.[0] || null)} />
                  <button onClick={() => updateImageRef.current?.click()} className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme">
                    <ImageIcon />
                    {newUpdateImage ? newUpdateImage.name : 'Legg til bilde'}
                  </button>
                  {newUpdateImage && <button onClick={() => setNewUpdateImage(null)} className="text-xs text-red-400">Fjern</button>}
                </div>
              </div>
            </div>

            {/* ══════════ SECTION 2: Pressemeldinger ══════════ */}
            <div className="border-t border-cyan-500/20 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                Pressemeldinger
                <span className="text-xs text-theme-muted font-normal">Synlig for presse</span>
              </h3>

              {/* Main pressemelding */}
              <div className="mb-3">
                <label className="block text-xs text-cyan-600 mb-1 uppercase font-semibold">Hovedpressemelding</label>
                <textarea value={editPressetekst} onChange={(e) => setEditPressetekst(e.target.value)} placeholder="Skriv hovedpressemelding..." className="w-full px-3 py-2 bg-theme-input border border-cyan-500/30 rounded-lg text-theme text-sm focus:outline-none focus:border-cyan-500 h-16 resize-none" />
              </div>

              {/* Existing presseoppdateringer */}
              {(selectedH.presseoppdateringer?.length ?? 0) > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedH.presseoppdateringer?.map(p => (
                    <div key={p.id} className={`rounded-lg p-3 ${p.deaktivert ? 'bg-cyan-500/5 border border-cyan-500/10 opacity-40' : 'bg-cyan-500/5 border border-cyan-500/20'}`}>
                      {p.deaktivert ? (
                        <p className="text-xs text-theme-dim italic">Deaktivert pressemelding</p>
                      ) : editingPresseId === p.id ? (
                        <div>
                          <textarea value={editPresseText} onChange={(e) => setEditPresseText(e.target.value)} className="w-full px-2 py-1.5 bg-theme-sidebar border border-cyan-500/50 rounded text-theme text-sm focus:outline-none h-16 resize-none" />
                          <ImageEditControls currentUrl={p.bilde_url} accentColor="cyan" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handlePresseEdit(p.id, selectedH.id)} className="px-3 py-1 bg-cyan-600 text-white rounded text-xs">Lagre</button>
                            <button onClick={() => { setEditingPresseId(null); resetEditImageState() }} className="px-3 py-1 text-theme-secondary text-xs">Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-theme-secondary">{p.tekst}</p>
                            {p.bilde_url && <img src={p.bilde_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
                            <p className="text-xs text-theme-muted mt-1">
                              {formatDateTime(p.opprettet_tidspunkt)}
                              {getUserName(p.opprettet_av) && <> &middot; Av: {getUserName(p.opprettet_av)}</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setEditingPresseId(p.id); setEditPresseText(p.tekst); resetEditImageState() }} className="p-1 text-theme-muted hover:text-cyan-400" title="Rediger"><EditIcon /></button>
                            <button onClick={() => handleDeactivatePresse(p.id)} className="p-1 text-theme-muted hover:text-red-400" title="Deaktiver"><DeactivateIcon /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* New presseoppdatering */}
              <div className="space-y-2">
                <label className="block text-xs text-theme-muted">Ny pressemelding</label>
                <textarea value={newPresse} onChange={(e) => setNewPresse(e.target.value)} placeholder="Skriv en pressemelding..." className="w-full px-3 py-2 bg-theme-input border border-cyan-500/30 rounded-lg text-theme text-sm focus:outline-none focus:border-cyan-500 h-16 resize-none" />
                <div className="flex items-center gap-3">
                  <input type="file" ref={presseImageRef} accept="image/*" className="hidden" onChange={(e) => setNewPresseImage(e.target.files?.[0] || null)} />
                  <button onClick={() => presseImageRef.current?.click()} className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme">
                    <ImageIcon />
                    {newPresseImage ? newPresseImage.name : 'Legg til bilde'}
                  </button>
                  {newPresseImage && <button onClick={() => setNewPresseImage(null)} className="text-xs text-red-400">Fjern</button>}
                </div>
              </div>
            </div>

            {/* ══════════ SECTION 3: Interne notater ══════════ */}
            <div className="border-t border-yellow-500/20 pt-4 mb-4">
              <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Interne notater ({selectedH.interne_notater?.filter(n => !n.deaktivert).length || 0})
                <span className="text-xs text-yellow-500/60 font-normal">Kun synlig for operatører</span>
              </h3>

              {(selectedH.interne_notater?.length ?? 0) > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedH.interne_notater?.map(n => (
                    <div key={n.id} className={`rounded-lg p-3 ${n.deaktivert ? 'bg-yellow-500/5 border border-yellow-500/10 opacity-40' : 'bg-yellow-500/5 border border-yellow-500/20'}`}>
                      {n.deaktivert ? (
                        <p className="text-xs text-theme-dim italic">Deaktivert notat</p>
                      ) : editingNotatId === n.id ? (
                        <div>
                          <textarea value={editNotatText} onChange={(e) => setEditNotatText(e.target.value)} className="w-full px-2 py-1.5 bg-theme-sidebar border border-yellow-500/50 rounded text-theme text-sm focus:outline-none h-16 resize-none" />
                          <ImageEditControls currentUrl={n.bilde_url} accentColor="yellow" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleNotatEdit(n.id, selectedH.id)} className="px-3 py-1 bg-yellow-600 text-white rounded text-xs">Lagre</button>
                            <button onClick={() => { setEditingNotatId(null); resetEditImageState() }} className="px-3 py-1 text-theme-secondary text-xs">Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-theme-secondary">{n.notat}</p>
                            {n.bilde_url && <img src={n.bilde_url} alt="" className="mt-2 rounded-lg max-h-40 object-cover" />}
                            <p className="text-xs text-theme-muted mt-1">
                              {formatDateTime(n.opprettet_tidspunkt)}
                              {getUserName(n.opprettet_av) && <> &middot; Av: {getUserName(n.opprettet_av)}</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setEditingNotatId(n.id); setEditNotatText(n.notat); resetEditImageState() }} className="p-1 text-theme-muted hover:text-yellow-400" title="Rediger"><EditIcon /></button>
                            <button onClick={() => handleDeactivateNotat(n.id)} className="p-1 text-theme-muted hover:text-red-400" title="Deaktiver"><DeactivateIcon /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs text-theme-muted">Nytt internt notat</label>
                <textarea value={newNotat} onChange={(e) => setNewNotat(e.target.value)} placeholder="Skriv et internt notat (kun synlig for operatører)..." className="w-full px-3 py-2 bg-theme-input border border-yellow-500/30 rounded-lg text-theme text-sm focus:outline-none focus:border-yellow-500 h-16 resize-none" />
                <div className="flex items-center gap-3">
                  <input type="file" ref={notatImageRef} accept="image/*" className="hidden" onChange={(e) => setNewNotatImage(e.target.files?.[0] || null)} />
                  <button onClick={() => notatImageRef.current?.click()} className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme">
                    <ImageIcon />
                    {newNotatImage ? newNotatImage.name : 'Legg til bilde'}
                  </button>
                  {newNotatImage && <button onClick={() => setNewNotatImage(null)} className="text-xs text-red-400">Fjern</button>}
                </div>
              </div>
            </div>

            {/* Save/Close buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleSaveChanges} disabled={saving || uploadingImage} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation">
                {uploadingImage ? 'Laster opp bilde...' : saving ? 'Lagrer...' : 'Lagre endringer'}
              </button>
              <button onClick={() => setSelectedHendelse(null)} className="py-3 sm:px-4 bg-theme border border-theme text-theme-secondary rounded-lg text-sm hover:text-theme transition-colors touch-manipulation">Lukk</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

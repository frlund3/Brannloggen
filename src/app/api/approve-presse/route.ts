import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify caller is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
    }

    // 2. Admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 3. Check caller's role
    const { data: callerProfile } = await adminClient
      .from('brukerprofiler')
      .select('rolle')
      .eq('user_id', user.id)
      .single()

    if (!callerProfile || (callerProfile.rolle !== 'admin' && callerProfile.rolle !== '110-admin')) {
      return NextResponse.json({ error: 'Kun admin kan behandle pressesøknader' }, { status: 403 })
    }

    // 4. Parse request
    const { soknad_id, action, avvisningsgrunn } = await req.json()

    if (!soknad_id || !action) {
      return NextResponse.json({ error: 'Mangler soknad_id eller action' }, { status: 400 })
    }
    if (!['godkjent', 'avvist'].includes(action)) {
      return NextResponse.json({ error: 'action må være "godkjent" eller "avvist"' }, { status: 400 })
    }

    // 5. Fetch søknad
    const { data: soknad, error: soknadError } = await adminClient
      .from('presse_soknader')
      .select('*')
      .eq('id', soknad_id)
      .single()

    if (soknadError || !soknad) {
      return NextResponse.json({ error: 'Søknad ikke funnet' }, { status: 404 })
    }

    if (soknad.status !== 'venter') {
      return NextResponse.json({ error: 'Søknaden er allerede behandlet' }, { status: 400 })
    }

    // 6. Handle rejection
    if (action === 'avvist') {
      await adminClient
        .from('presse_soknader')
        .update({
          status: 'avvist',
          behandlet_av: user.id,
          behandlet_tidspunkt: new Date().toISOString(),
          avvisningsgrunn: avvisningsgrunn || null,
        })
        .eq('id', soknad_id)

      return NextResponse.json({ success: true, action: 'avvist' })
    }

    // 7. Handle approval - resolve medium_id
    let mediumId = soknad.medium_id || null
    if (!mediumId && soknad.mediehus) {
      const { data: existingMedium } = await adminClient
        .from('medier')
        .select('id')
        .ilike('navn', soknad.mediehus)
        .maybeSingle()

      if (existingMedium) {
        mediumId = existingMedium.id
      } else {
        const { data: newMedium, error: mediumError } = await adminClient
          .from('medier')
          .insert({ navn: soknad.mediehus, type: 'annet', aktiv: true })
          .select('id')
          .single()

        if (!mediumError && newMedium) {
          mediumId = newMedium.id
        }
      }

      if (mediumId) {
        await adminClient
          .from('presse_soknader')
          .update({ medium_id: mediumId })
          .eq('id', soknad_id)
      }
    }

    // 8. Check if email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some((u: { email?: string }) => u.email === soknad.epost)
    if (emailExists) {
      return NextResponse.json({ error: 'En bruker med denne e-postadressen finnes allerede' }, { status: 400 })
    }

    // 9. Create auth user and send invitation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brannloggen.no'
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.inviteUserByEmail(soknad.epost, {
      redirectTo: `${siteUrl}/oppdater-passord`,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 10. Create brukerprofil
    const { error: profilError } = await adminClient
      .from('brukerprofiler')
      .insert({
        user_id: newAuthUser.user.id,
        fullt_navn: soknad.fullt_navn,
        epost: soknad.epost,
        rolle: 'presse',
        sentral_ids: [],
        aktiv: true,
        medium_id: mediumId,
      })

    if (profilError) {
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({ error: profilError.message }, { status: 500 })
    }

    // 11. Update søknad status
    await adminClient
      .from('presse_soknader')
      .update({
        status: 'godkjent',
        behandlet_av: user.id,
        behandlet_tidspunkt: new Date().toISOString(),
      })
      .eq('id', soknad_id)

    return NextResponse.json({
      success: true,
      action: 'godkjent',
      user: {
        id: newAuthUser.user.id,
        fullt_navn: soknad.fullt_navn,
        epost: soknad.epost,
      },
    })
  } catch (e) {
    console.error('[approve-presse] Error:', e)
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

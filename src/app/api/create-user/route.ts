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

    // 2. Admin client with service role key
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 3. Check caller's role
    const { data: callerProfile } = await adminClient
      .from('brukerprofiler')
      .select('rolle, sentral_ids')
      .eq('user_id', user.id)
      .single()

    if (!callerProfile || (callerProfile.rolle !== 'admin' && callerProfile.rolle !== '110-admin')) {
      return NextResponse.json({ error: 'Kun admin kan opprette brukere' }, { status: 403 })
    }

    // 4. Parse request body
    const { fullt_navn, epost, rolle, sentral_ids = [] } = await req.json()

    if (!fullt_navn || fullt_navn.length < 2) {
      return NextResponse.json({ error: 'Navn må være minst 2 tegn' }, { status: 400 })
    }
    if (!epost || !epost.includes('@')) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse' }, { status: 400 })
    }
    if (!['admin', '110-admin', 'operator'].includes(rolle)) {
      return NextResponse.json({ error: 'Ugyldig rolle' }, { status: 400 })
    }

    // 5. 110-admin can only create operators and 110-admins
    if (callerProfile.rolle === '110-admin') {
      if (rolle !== 'operator' && rolle !== '110-admin') {
        return NextResponse.json({ error: '110-admin kan kun opprette operatører og 110-admins' }, { status: 403 })
      }
    }

    // 6. Create auth user
    const tempPassword = crypto.randomUUID()
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: epost,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 7. Create brukerprofil
    const { data: profil, error: profilError } = await adminClient
      .from('brukerprofiler')
      .insert({
        user_id: newAuthUser.user.id,
        fullt_navn,
        epost,
        rolle,
        sentral_ids: sentral_ids || [],
        aktiv: true,
      })
      .select()
      .single()

    if (profilError) {
      // Rollback: delete auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({ error: profilError.message }, { status: 500 })
    }

    // 8. Send password reset email
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: epost,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: profil.id,
        user_id: newAuthUser.user.id,
        fullt_navn,
        epost,
        rolle,
        sentral_ids: sentral_ids || [],
        aktiv: true,
        created_at: profil.created_at,
      },
    })
  } catch (e) {
    console.error('[create-user] Error:', e)
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

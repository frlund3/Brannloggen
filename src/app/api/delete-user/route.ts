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
      .select('rolle')
      .eq('user_id', user.id)
      .single()

    if (!callerProfile || (callerProfile.rolle !== 'admin' && callerProfile.rolle !== '110-admin')) {
      return NextResponse.json({ error: 'Kun admin kan slette brukere' }, { status: 403 })
    }

    // 4. Get profile ID from request
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Mangler bruker-id' }, { status: 400 })
    }

    // 5. Look up the profile to get user_id (auth user ID)
    const { data: profile, error: profileError } = await adminClient
      .from('brukerprofiler')
      .select('user_id, epost')
      .eq('id', id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Fant ikke brukerprofil' }, { status: 404 })
    }

    // 6. Delete auth user (cascade will also delete brukerprofil)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(profile.user_id)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[delete-user] Error:', e)
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

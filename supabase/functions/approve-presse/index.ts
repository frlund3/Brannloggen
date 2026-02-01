// Supabase Edge Function: approve-presse
// Approves or rejects a press access request.
// On approval: creates auth user + brukerprofil, sends password reset email.
// Only callable by admin or 110-admin users.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is admin/110-admin
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerProfile } = await adminClient
      .from('brukerprofiler')
      .select('rolle')
      .eq('user_id', caller.id)
      .single()

    if (!callerProfile || (callerProfile.rolle !== 'admin' && callerProfile.rolle !== '110-admin')) {
      return new Response(JSON.stringify({ error: 'Kun admin kan behandle pressesøknader' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { soknad_id, action, avvisningsgrunn } = await req.json()

    if (!soknad_id || !action || !['godkjent', 'avvist'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Mangler soknad_id eller ugyldig action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the søknad
    const { data: soknad, error: soknadError } = await adminClient
      .from('presse_soknader')
      .select('*')
      .eq('id', soknad_id)
      .single()

    if (soknadError || !soknad) {
      return new Response(JSON.stringify({ error: 'Søknad ikke funnet' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (soknad.status !== 'venter') {
      return new Response(JSON.stringify({ error: 'Søknaden er allerede behandlet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'avvist') {
      await adminClient
        .from('presse_soknader')
        .update({
          status: 'avvist',
          behandlet_av: caller.id,
          behandlet_tidspunkt: new Date().toISOString(),
          avvisningsgrunn: avvisningsgrunn || null,
        })
        .eq('id', soknad_id)

      return new Response(JSON.stringify({ success: true, action: 'avvist' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // action === 'godkjent'
    // Check if email already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email === soknad.epost)
    if (emailExists) {
      return new Response(JSON.stringify({ error: 'En bruker med denne e-postadressen finnes allerede' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create auth user
    const tempPassword = crypto.randomUUID()
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: soknad.epost,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create brukerprofil
    const { error: profilError } = await adminClient
      .from('brukerprofiler')
      .insert({
        user_id: newAuthUser.user.id,
        fullt_navn: soknad.fullt_navn,
        epost: soknad.epost,
        rolle: 'presse',
        sentral_ids: [],
        aktiv: true,
      })

    if (profilError) {
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(newAuthUser.user.id)
      return new Response(JSON.stringify({ error: profilError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update søknad status
    await adminClient
      .from('presse_soknader')
      .update({
        status: 'godkjent',
        behandlet_av: caller.id,
        behandlet_tidspunkt: new Date().toISOString(),
      })
      .eq('id', soknad_id)

    // Send password reset email so user can set their password
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: soknad.epost,
    })

    return new Response(JSON.stringify({
      success: true,
      action: 'godkjent',
      user: {
        id: newAuthUser.user.id,
        fullt_navn: soknad.fullt_navn,
        epost: soknad.epost,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Approve presse error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

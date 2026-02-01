// Supabase Edge Function: create-user
// Creates a new auth user + brukerprofil record.
// Only callable by admin or 110-admin users.
//
// Env vars required:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3'

const allowedOrigins = [
  'https://brannloggen.no',
  'https://www.brannloggen.no',
  ...(Deno.env.get('ALLOWED_ORIGIN') ? [Deno.env.get('ALLOWED_ORIGIN')!] : []),
  'http://localhost:3000',
  'http://localhost:3001',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Verify the caller is authenticated and is admin/110-admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client with caller's JWT to verify permissions
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Check caller's role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerProfile } = await adminClient
      .from('brukerprofiler')
      .select('rolle, sentral_ids')
      .eq('user_id', caller.id)
      .single()

    if (!callerProfile || (callerProfile.rolle !== 'admin' && callerProfile.rolle !== '110-admin')) {
      return new Response(JSON.stringify({ error: 'Kun admin kan opprette brukere' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Parse and validate request body
    const CreateUserSchema = z.object({
      fullt_navn: z.string().min(2, 'Navn må være minst 2 tegn').max(200, 'Navn kan ikke være over 200 tegn'),
      epost: z.string().email('Ugyldig e-postadresse').max(254),
      rolle: z.enum(['admin', '110-admin', 'operator', 'presse'], { message: 'Ugyldig rolle' }),
      sentral_ids: z.array(z.string().uuid()).optional().default([]),
    })

    let body: unknown
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ error: 'Ugyldig JSON i forespørselen' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Ugyldig input' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const { fullt_navn, epost, rolle, sentral_ids } = parsed.data

    // 110-admin can only create operators and 110-admins within their sentraler
    if (callerProfile.rolle === '110-admin') {
      if (rolle !== 'operator' && rolle !== '110-admin') {
        return new Response(JSON.stringify({ error: '110-admin kan kun opprette operatører og 110-admins' }), {
          status: 403,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    }

    // Create auth user with a random password (user will reset via email)
    const tempPassword = crypto.randomUUID()
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: epost,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Create brukerprofil
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
      return new Response(JSON.stringify({ error: profilError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Send password reset email so user can set their own password
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: epost,
    })

    return new Response(JSON.stringify({
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
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Create user error:', error)
    return new Response(JSON.stringify({ error: 'En intern feil oppstod' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})

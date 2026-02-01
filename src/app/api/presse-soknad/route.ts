import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Rate limit: 3 applications per hour per IP
const soknadLimiter = rateLimit({ maxRequests: 3, windowMs: 60 * 60 * 1000 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const result = soknadLimiter(`presse-soknad:${ip}`)

  if (!result.success) {
    return NextResponse.json(
      { error: 'For mange forespørsler. Prøv igjen senere.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.retryAfterMs || 3600_000) / 1000)),
        },
      },
    )
  }

  try {
    const body = await req.json()
    const { fullt_navn, epost, mediehus, medium_id, telefon } = body

    // Validate required fields
    if (!fullt_navn || typeof fullt_navn !== 'string' || fullt_navn.trim().length < 2) {
      return NextResponse.json({ error: 'Navn må være minst 2 tegn' }, { status: 400 })
    }

    if (!epost || typeof epost !== 'string' || !epost.includes('@')) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse' }, { status: 400 })
    }

    if (!mediehus && !medium_id) {
      return NextResponse.json({ error: 'Mediehus er påkrevd' }, { status: 400 })
    }

    // Use service role to insert (bypasses RLS, server-side only)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error: insertError } = await adminClient.from('presse_soknader').insert({
      fullt_navn: fullt_navn.trim(),
      epost: epost.trim().toLowerCase(),
      mediehus: typeof mediehus === 'string' ? mediehus.trim() : mediehus,
      medium_id: medium_id || null,
      telefon: telefon || null,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        // Return generic success to prevent email enumeration
        return NextResponse.json({ success: true })
      }
      console.error('[presse-soknad] Insert error:', insertError.message)
      return NextResponse.json({ error: 'Kunne ikke sende søknad. Prøv igjen.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

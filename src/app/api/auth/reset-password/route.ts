import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Strict rate limit: 3 reset requests per 15 minutes per IP
const resetLimiter = rateLimit({ maxRequests: 3, windowMs: 15 * 60 * 1000 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const result = resetLimiter(`reset:${ip}`)

  if (!result.success) {
    return NextResponse.json(
      { error: 'For mange forespørsler. Prøv igjen om noen minutter.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.retryAfterMs || 900_000) / 1000)),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  try {
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || 'https://brannloggen.no'
    const supabase = await createServerSupabaseClient()

    // resetPasswordForEmail sends the email via Supabase's configured SMTP
    // Always return success regardless of result to prevent email enumeration
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/oppdater-passord`,
    })

    return NextResponse.json({ success: true })
  } catch {
    // Return success even on error to prevent information leakage
    return NextResponse.json({ success: true })
  }
}

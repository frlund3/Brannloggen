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

    const supabase = await createServerSupabaseClient()

    // Build the callback URL for the reset email.
    // Supabase will append ?code=... to this URL via PKCE flow.
    // The /auth/callback route exchanges the code for a session
    // and redirects to /oppdater-passord.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brannloggen.no'
    const redirectTo = `${siteUrl}/auth/callback?next=/oppdater-passord`

    // Always return success regardless of result to prevent email enumeration
    await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    return NextResponse.json({ success: true })
  } catch {
    // Return success even on error to prevent information leakage
    return NextResponse.json({ success: true })
  }
}

import { createClient } from '@supabase/supabase-js'
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

    // Use a plain Supabase client with implicit flow (NOT the SSR client).
    // The SSR client uses PKCE which stores a code_verifier cookie in the
    // current browser session. But the person clicking the reset link may be
    // on a different browser/device (or an admin sent it on their behalf),
    // so the code_verifier cookie won't exist and exchangeCodeForSession fails.
    //
    // With implicit flow, Supabase redirects directly to the redirect URL with
    // #access_token=...&refresh_token=...&type=recovery in the hash fragment.
    // The /oppdater-passord page already handles this (reads hash and calls setSession).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
    )

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brannloggen.no'

    // Always return success regardless of result to prevent email enumeration
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/oppdater-passord`,
    })

    return NextResponse.json({ success: true })
  } catch {
    // Return success even on error to prevent information leakage
    return NextResponse.json({ success: true })
  }
}

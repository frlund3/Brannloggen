import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Strict rate limit: 5 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({ maxRequests: 5, windowMs: 15 * 60 * 1000 })

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const result = loginLimiter(`login:${ip}`)

  if (!result.success) {
    return NextResponse.json(
      { error: 'For mange innloggingsforsøk. Prøv igjen om noen minutter.' },
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
    const { email, password } = body

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'E-post og passord er påkrevd' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json(
        { error: 'Feil e-post eller passord' },
        { status: 401 },
      )
    }

    return NextResponse.json({
      user: { id: data.user.id },
    })
  } catch (e) {
    console.error('[login] Uventet feil:', e)
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

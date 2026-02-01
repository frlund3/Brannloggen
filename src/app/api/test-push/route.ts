import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Rate limit: 10 requests per minute per IP
const limiter = rateLimit({ maxRequests: 10, windowMs: 60_000 })

function rateLimitResponse(result: ReturnType<ReturnType<typeof rateLimit>>) {
  return NextResponse.json(
    { error: 'For mange forespørsler. Prøv igjen senere.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((result.retryAfterMs || 60_000) / 1000)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const result = limiter(`test-push:POST:${ip}`)
  if (!result.success) return rateLimitResponse(result)

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const edgeUrl = `${supabaseUrl}/functions/v1/send-push`

    const edgeRes = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ test: true }),
    })

    const edgeText = await edgeRes.text()

    if (!edgeRes.ok) {
      console.error('Edge function failed:', edgeRes.status, edgeText)
      return NextResponse.json({
        error: 'Edge function feilet',
        detail: `HTTP ${edgeRes.status}`,
      }, { status: 500 })
    }

    return NextResponse.json(JSON.parse(edgeText))
  } catch (e) {
    console.error('test-push POST error:', e)
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const result = limiter(`test-push:GET:${ip}`)
  if (!result.success) return rateLimitResponse(result)

  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
    }

    const { data: subscribers, error: dbError } = await supabase
      .from('push_abonnenter')
      .select('platform, push_aktiv')

    if (dbError) {
      return NextResponse.json({ error: 'Kunne ikke hente data' }, { status: 500 })
    }

    const stats = {
      total: subscribers?.length || 0,
      active: subscribers?.filter(s => s.push_aktiv).length || 0,
      platforms: {} as Record<string, number>,
    }

    for (const sub of subscribers || []) {
      if (sub.push_aktiv) {
        stats.platforms[sub.platform] = (stats.platforms[sub.platform] || 0) + 1
      }
    }

    return NextResponse.json(stats)
  } catch (e) {
    console.error('test-push GET error:', e)
    return NextResponse.json({ error: 'En intern feil oppstod' }, { status: 500 })
  }
}

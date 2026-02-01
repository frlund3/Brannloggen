import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()

    // Only logged-in users (admin/operator) can send test push
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget', detail: authError?.message }, { status: 401 })
    }

    // Call the send-push edge function directly via fetch
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
    console.log('Edge function response:', edgeRes.status, edgeText)

    if (!edgeRes.ok) {
      return NextResponse.json({
        error: 'Edge function feilet',
        detail: `HTTP ${edgeRes.status}`,
        edgeResponse: edgeText,
      }, { status: 500 })
    }

    return NextResponse.json(JSON.parse(edgeText))
  } catch (e) {
    console.error('test-push POST error:', e)
    return NextResponse.json({
      error: 'Uventet feil',
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget', detail: authError?.message }, { status: 401 })
    }

    // Fetch subscriber stats
    const { data: subscribers, error: dbError } = await supabase
      .from('push_abonnenter')
      .select('platform, push_aktiv')

    if (dbError) {
      return NextResponse.json({ error: 'DB-feil', detail: dbError.message }, { status: 500 })
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
    return NextResponse.json({
      error: 'Uventet feil',
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}

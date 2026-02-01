// Supabase Edge Function: send-push
// Processes the push_notification_queue and sends push notifications
// to matching push_abonnenter.
//
// Trigger: Called via pg_net (database webhook) or cron schedule.
// Env vars required:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
//   - FCM_SERVER_KEY (for Android push via FCM)
//   - APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (for iOS push via APNs)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueItem {
  id: number
  hendelse_id: string
  event_type: 'ny_hendelse' | 'oppdatering' | 'status_endring'
  payload: Record<string, unknown>
  processed: boolean
}

interface PushAbonnent {
  id: string
  device_id: string
  platform: string
  push_token: string
  push_aktiv: boolean
  sentral_ids: string[]
  fylke_ids: string[]
  kategori_ids: string[]
  kun_pågående: boolean
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch unprocessed queue items
    const { data: queue, error: queueError } = await supabase
      .from('push_notification_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (queueError) {
      throw new Error(`Queue fetch error: ${queueError.message}`)
    }

    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ message: 'No items in queue' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all active subscribers
    const { data: subscribers } = await supabase
      .from('push_abonnenter')
      .select('*')
      .eq('push_aktiv', true)

    const activeSubscribers: PushAbonnent[] = subscribers || []
    const results: { queued: number; sent: number; errors: number } = { queued: queue.length, sent: 0, errors: 0 }

    for (const item of queue as QueueItem[]) {
      const payload = item.payload
      const matchingSubscribers = activeSubscribers.filter((sub) => {
        // Filter by fylke preference
        if (sub.fylke_ids.length > 0 && payload.fylke_id) {
          if (!sub.fylke_ids.includes(payload.fylke_id as string)) return false
        }

        // Filter by kategori preference
        if (sub.kategori_ids.length > 0 && payload.kategori_id) {
          if (!sub.kategori_ids.includes(payload.kategori_id as string)) return false
        }

        // Filter for only ongoing
        if (sub.kun_pågående && payload.status && payload.status !== 'pågår') {
          return false
        }

        return true
      })

      // Build notification content
      const title = buildTitle(item)
      const body = buildBody(item)

      // Send to each matching subscriber
      for (const sub of matchingSubscribers) {
        try {
          await sendPushToDevice(sub, title, body, item.hendelse_id)
          results.sent++
        } catch (e) {
          console.error(`Failed to send to ${sub.device_id}:`, e)
          results.errors++
        }
      }

      // Mark as processed
      await supabase
        .from('push_notification_queue')
        .update({ processed: true })
        .eq('id', item.id)
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildTitle(item: QueueItem): string {
  switch (item.event_type) {
    case 'ny_hendelse':
      return `🔥 Ny hendelse: ${item.payload.tittel || 'Ukjent'}`
    case 'oppdatering':
      return '📋 Ny oppdatering'
    case 'status_endring':
      return `⚡ Status endret: ${item.payload.ny_status || ''}`
    default:
      return 'Brannloggen'
  }
}

function buildBody(item: QueueItem): string {
  switch (item.event_type) {
    case 'ny_hendelse':
      return `${item.payload.sted || ''} - ${item.payload.alvorlighetsgrad || ''}`
    case 'oppdatering':
      return (item.payload.tekst as string)?.slice(0, 200) || ''
    case 'status_endring':
      return `${item.payload.tittel || ''}: ${item.payload.gammel_status} → ${item.payload.ny_status}`
    default:
      return ''
  }
}

async function sendPushToDevice(
  sub: PushAbonnent,
  title: string,
  body: string,
  hendelseId: string,
) {
  if (sub.platform === 'Web') {
    await sendWebPush(sub.push_token, title, body, hendelseId)
  } else if (sub.platform === 'Android') {
    await sendFCM(sub.push_token, title, body, hendelseId)
  } else if (sub.platform === 'iOS') {
    await sendAPNs(sub.push_token, title, body, hendelseId)
  }
}

// ── FCM (Android) ──────────────────────────────────────────────────

async function sendFCM(token: string, title: string, body: string, hendelseId: string) {
  const serverKey = Deno.env.get('FCM_SERVER_KEY')
  if (!serverKey) {
    console.warn('FCM_SERVER_KEY not configured, skipping Android push')
    return
  }

  await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data: { hendelse_id: hendelseId, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    }),
  })
}

// ── APNs (iOS) ─────────────────────────────────────────────────────

async function sendAPNs(token: string, title: string, body: string, hendelseId: string) {
  // APNs requires JWT auth - for now log and skip if not configured
  const teamId = Deno.env.get('APNS_TEAM_ID')
  const keyId = Deno.env.get('APNS_KEY_ID')

  if (!teamId || !keyId) {
    console.warn('APNs not configured, skipping iOS push')
    return
  }

  // APNs HTTP/2 push - production implementation would use p8 key signing
  console.log(`APNs push queued for token ${token.slice(0, 8)}...: ${title}`)
  console.log(`Data: hendelse_id=${hendelseId}, body=${body}`)
}

// ── Web Push ───────────────────────────────────────────────────────

async function sendWebPush(subscriptionJson: string, title: string, body: string, hendelseId: string) {
  try {
    const subscription = JSON.parse(subscriptionJson)
    // Web Push requires VAPID signing - log for now
    console.log(`Web push to ${subscription.endpoint?.slice(0, 40)}...: ${title}`)
    console.log(`Data: hendelse_id=${hendelseId}, body=${body}`)
  } catch {
    console.error('Invalid web push subscription JSON')
  }
}

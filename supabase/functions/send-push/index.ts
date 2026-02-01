// Supabase Edge Function: send-push
// Processes the push_notification_queue and sends push notifications
// to matching push_abonnenter.
//
// Trigger: Called via pg_net (database webhook) or cron schedule.
// Env vars required:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
//   - VAPID_PRIVATE_KEY (base64url-encoded, for Web Push VAPID signing)
//   - VAPID_SUBJECT (mailto: or https: URL identifying the app server)
//   - FCM_SERVER_KEY (for Android push via FCM)
//   - APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (for iOS push via APNs)
//   - APNS_SANDBOX (set to 'true' for dev/Xcode builds, swap to prod keys for App Store)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://brannloggen.no'

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
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
    // Auth: accept service role key, user JWTs, or Supabase-internal calls
    // The Next.js API route already verifies admin access before calling this
    const authHeader = req.headers.get('Authorization') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = req.headers.get('apikey') || ''
    const isServiceCall = authHeader.includes(serviceKey)
    const isSupabaseCall = !!anonKey // Supabase client sends apikey header

    if (!isServiceCall && !isSupabaseCall) {
      return new Response(JSON.stringify({ error: 'Ikke autorisert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Check for test-push mode (send directly without queue)
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* no body */ }

    if (body.test === true) {
      const activeSubscribers = await fetchActiveSubscribers(supabase)
      const results = { sent: 0, errors: 0, total: activeSubscribers.length, platforms: {} as Record<string, number> }

      for (const sub of activeSubscribers) {
        results.platforms[sub.platform] = (results.platforms[sub.platform] || 0) + 1
        try {
          await sendPushToDevice(sub, '🔔 Testmelding', 'Push-notifikasjoner fungerer!', 'test')
          results.sent++
        } catch (e) {
          console.error(`Test push failed for ${sub.device_id}:`, e)
          results.errors++
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const activeSubscribers = await fetchActiveSubscribers(supabase)
    const results: { queued: number; sent: number; errors: number; skipped: number } = { queued: queue.length, sent: 0, errors: 0, skipped: 0 }

    // Pre-load brannvesen → sentral mapping for sentral_ids filtering
    const { data: brannvesenRows } = await supabase
      .from('brannvesen')
      .select('id, sentral_id')

    const brannvesenToSentral: Record<string, string> = {}
    for (const bv of brannvesenRows || []) {
      if (bv.sentral_id) brannvesenToSentral[bv.id] = bv.sentral_id
    }

    for (const item of queue as QueueItem[]) {
      const payload = item.payload

      // Resolve sentral_id from brannvesen_id if available
      const sentralId = payload.brannvesen_id
        ? brannvesenToSentral[payload.brannvesen_id as string] || null
        : null

      const matchingSubscribers = activeSubscribers.filter((sub) => {
        // Filter by sentral preference
        if (sub.sentral_ids.length > 0 && sentralId) {
          if (!sub.sentral_ids.includes(sentralId)) return false
        }

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

async function fetchActiveSubscribers(supabase: ReturnType<typeof createClient>): Promise<PushAbonnent[]> {
  const { data: subscribers } = await supabase
    .from('push_abonnenter')
    .select('*')
    .eq('push_aktiv', true)
  return (subscribers || []) as PushAbonnent[]
}

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

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
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

  if (!res.ok) {
    throw new Error(`FCM error: ${res.status} ${await res.text()}`)
  }
}

// ── APNs (iOS) ─────────────────────────────────────────────────────

// Cache APNs JWT per invocation to avoid TooManyProviderTokenUpdates (429)
let cachedApnsJwt: string | null = null

async function sendAPNs(token: string, title: string, body: string, hendelseId: string) {
  const teamId = Deno.env.get('APNS_TEAM_ID')
  const keyId = Deno.env.get('APNS_KEY_ID')
  const privateKeyPem = Deno.env.get('APNS_PRIVATE_KEY')
  const useSandbox = Deno.env.get('APNS_SANDBOX') === 'true'

  if (!teamId || !keyId || !privateKeyPem) {
    console.warn('APNs not fully configured, skipping iOS push')
    return
  }

  // Build JWT once, reuse for all devices in this invocation
  if (!cachedApnsJwt) {
    cachedApnsJwt = await buildApnsJwt(teamId, keyId, privateKeyPem)
  }
  const jwt = cachedApnsJwt

  const apnsHost = useSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'
  const res = await fetch(`https://${apnsHost}/3/device/${token}`, {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${jwt}`,
      'apns-topic': 'no.brannloggen.app',
      'apns-push-type': 'alert',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        'mutable-content': 1,
      },
      hendelse_id: hendelseId,
    }),
  })

  if (!res.ok) {
    throw new Error(`APNs error: ${res.status} ${await res.text()}`)
  }
}

async function buildApnsJwt(teamId: string, keyId: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'ES256', kid: keyId }
  const now = Math.floor(Date.now() / 1000)
  const claims = { iss: teamId, iat: now }

  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const claimsB64 = base64url(enc.encode(JSON.stringify(claims)))
  const signingInput = `${headerB64}.${claimsB64}`

  // Import the P-256 private key
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(signingInput),
  )

  return `${signingInput}.${base64url(new Uint8Array(signature))}`
}

// ── Web Push (VAPID signed) ──────────────────────────────────────

async function sendWebPush(subscriptionJson: string, title: string, body: string, hendelseId: string) {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:post@brannloggen.no'

  if (!vapidPrivateKey || !vapidPublicKey) {
    console.warn('VAPID keys not configured, skipping Web push')
    return
  }

  let subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  try {
    subscription = JSON.parse(subscriptionJson)
  } catch {
    console.error('Invalid web push subscription JSON')
    return
  }

  if (!subscription.endpoint || !subscription.keys) {
    console.error('Incomplete web push subscription (missing endpoint or keys)')
    return
  }

  const payload = JSON.stringify({
    title,
    body,
    tag: `hendelse-${hendelseId}`,
    url: `/hendelse/${hendelseId}`,
  })

  // Build VAPID Authorization header (RFC 8292)
  const audience = new URL(subscription.endpoint).origin
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600

  const jwtHeader = { typ: 'JWT', alg: 'ES256' }
  const jwtClaims = { aud: audience, exp: expiry, sub: vapidSubject }

  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(jwtHeader)))
  const claimsB64 = base64url(enc.encode(JSON.stringify(jwtClaims)))
  const unsignedToken = `${headerB64}.${claimsB64}`

  // Import VAPID private key (raw 32-byte P-256 scalar, base64url encoded)
  const rawKey = base64urlDecode(vapidPrivateKey)

  // Build PKCS8 wrapper for the raw 32-byte key
  const pkcs8 = buildPkcs8FromRaw(rawKey, base64urlDecode(vapidPublicKey))

  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    enc.encode(unsignedToken),
  )

  const token = `${unsignedToken}.${base64url(new Uint8Array(sig))}`
  const vapidPublicKeyForHeader = vapidPublicKey

  // Encrypt payload using Web Push encryption (RFC 8291 / aes128gcm)
  const encryptedPayload = await encryptPayload(
    subscription.keys.p256dh,
    subscription.keys.auth,
    enc.encode(payload),
  )

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${token}, k=${vapidPublicKeyForHeader}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: encryptedPayload,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Web push error: ${res.status} ${text}`)
  }
}

// ── Web Push Encryption (RFC 8291 aes128gcm) ────────────────────

async function encryptPayload(
  p256dhB64: string,
  authB64: string,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  // Decode subscriber keys
  const subscriberPublicKey = base64urlDecode(p256dhB64)
  const authSecret = base64urlDecode(authB64)

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )

  // Import subscriber public key
  const subPubKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subPubKey },
      localKeyPair.privateKey,
      256,
    ),
  )

  // Export local public key (uncompressed, 65 bytes)
  const localPubKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey),
  )

  const enc = new TextEncoder()

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || subscriber_pub || local_pub, 32)
  const ikm = await hkdf(
    authSecret,
    sharedSecret,
    concatBuffers(
      enc.encode('WebPush: info\0'),
      subscriberPublicKey,
      localPubKeyRaw,
    ),
    32,
  )

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // PRK = HKDF-Extract(salt, IKM)
  // CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)

  // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  // Pad plaintext with delimiter byte 0x02 (final record)
  const padded = concatBuffers(plaintext, new Uint8Array([2]))

  // AES-128-GCM encrypt
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded),
  )

  // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
  const rs = plaintext.length + 18 + 1 // record size (content + tag + padding delimiter)
  const header = new Uint8Array(16 + 4 + 1 + 65)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs > ciphertext.length + 86 ? ciphertext.length + 86 : 4096)
  header[20] = 65 // idlen = length of local public key
  header.set(localPubKeyRaw, 21)

  return concatBuffers(header, ciphertext)
}

// ── Crypto helpers ──────────────────────────────────────────────

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), ikm))

  // HKDF-Expand
  const infoLen = info.length
  const n = Math.ceil(length / 32)
  const okm = new Uint8Array(n * 32)
  let prev = new Uint8Array(0)
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  for (let i = 0; i < n; i++) {
    const input = concatBuffers(prev, info, new Uint8Array([i + 1]))
    prev = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, input))
    okm.set(prev, i * 32)
  }

  return okm.slice(0, length)
}

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((sum, b) => sum + b.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const buf of buffers) {
    result.set(buf, offset)
    offset += buf.length
  }
  return result
}

function base64url(data: Uint8Array): string {
  let str = ''
  for (const byte of data) str += String.fromCharCode(byte)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/**
 * Build a PKCS8 DER structure for an EC P-256 private key from a raw 32-byte scalar
 * and the corresponding 65-byte uncompressed public key.
 */
function buildPkcs8FromRaw(rawPrivateKey: Uint8Array, rawPublicKey: Uint8Array): Uint8Array {
  // PKCS8 prefix for EC P-256 key
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, // SEQUENCE
    0x02, 0x01, 0x00, // INTEGER 0 (version)
    0x30, 0x13,       // SEQUENCE (AlgorithmIdentifier)
    0x06, 0x07,       // OID 1.2.840.10045.2.1 (EC)
    0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08,       // OID 1.2.840.10045.3.1.7 (P-256)
    0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x6d,       // OCTET STRING (containing ECPrivateKey)
    0x30, 0x6b,       // SEQUENCE (ECPrivateKey)
    0x02, 0x01, 0x01, // INTEGER 1 (version)
    0x04, 0x20,       // OCTET STRING (32 bytes, private key)
  ])

  const middle = new Uint8Array([
    0xa1, 0x44,       // [1] (public key)
    0x03, 0x42, 0x00, // BIT STRING (66 bytes)
  ])

  return concatBuffers(prefix, rawPrivateKey, middle, rawPublicKey)
}

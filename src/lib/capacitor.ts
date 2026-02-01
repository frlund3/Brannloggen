'use client'

/**
 * Capacitor native bridge utilities.
 * Works in both web (no-op) and native (iOS/Android) contexts.
 */

// Runtime detection: are we running inside a Capacitor native shell?
export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.()
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const p = cap?.getPlatform?.()
  if (p === 'ios') return 'ios'
  if (p === 'android') return 'android'
  return 'web'
}

// ── Push Notifications ───────────────────────────────────────────────

export interface PushToken {
  value: string
}

/**
 * Request push notification permission and register the device.
 * Returns the push token string, or null if permission denied / web context.
 */
export async function registerPush(): Promise<string | null> {
  if (!isNative()) {
    // Web: try Web Push API if available
    return registerWebPush()
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Check / request permission
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') {
      return null
    }

    // Register returns token via listener
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10_000)

      PushNotifications.addListener('registration', (token: PushToken) => {
        clearTimeout(timeout)
        resolve(token.value)
      })

      PushNotifications.addListener('registrationError', () => {
        clearTimeout(timeout)
        resolve(null)
      })

      PushNotifications.register()
    })
  } catch {
    console.warn('Push registration failed')
    return null
  }
}

/**
 * Set up push notification received/action listeners.
 * Call once on app startup.
 */
export async function setupPushListeners(
  onReceived?: (notification: unknown) => void,
  onAction?: (notification: unknown) => void,
) {
  if (!isNative()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      onReceived?.(notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      onAction?.(action)
    })
  } catch {
    // Not in native context
  }
}

// ── Web Push (Service Worker based) ────────────────────────────────

async function registerWebPush(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  try {
    const registration = await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // VAPID public key should be set as env var
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set, web push disabled')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisuallyOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    } as PushSubscriptionOptionsInit)

    // Return the endpoint as the "token" for web push
    return JSON.stringify(subscription.toJSON())
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

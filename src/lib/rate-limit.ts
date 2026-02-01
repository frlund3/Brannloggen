/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window approach per IP address.
 *
 * Note: This is per-instance. For multi-instance deployments,
 * consider Vercel Rate Limiting or an external store (Redis/Upstash).
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - windowMs
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
  retryAfterMs?: number
}

export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config

  return function check(identifier: string): RateLimitResult {
    cleanup(windowMs)

    const now = Date.now()
    const cutoff = now - windowMs

    let entry = store.get(identifier)
    if (!entry) {
      entry = { timestamps: [] }
      store.set(identifier, entry)
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0]
      const retryAfterMs = oldestInWindow + windowMs - now

      return {
        success: false,
        remaining: 0,
        limit: maxRequests,
        retryAfterMs,
      }
    }

    entry.timestamps.push(now)

    return {
      success: true,
      remaining: maxRequests - entry.timestamps.length,
      limit: maxRequests,
    }
  }
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and direct connections.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

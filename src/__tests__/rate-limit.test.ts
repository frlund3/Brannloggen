import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows requests within the limit', () => {
    const check = rateLimit({ maxRequests: 3, windowMs: 60_000 })

    const r1 = check('192.168.1.1')
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = check('192.168.1.1')
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = check('192.168.1.1')
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests exceeding the limit', () => {
    const check = rateLimit({ maxRequests: 2, windowMs: 60_000 })

    check('10.0.0.1')
    check('10.0.0.1')

    const blocked = check('10.0.0.1')
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks different IPs independently', () => {
    const check = rateLimit({ maxRequests: 1, windowMs: 60_000 })

    const r1 = check('ip-a')
    expect(r1.success).toBe(true)

    const r2 = check('ip-b')
    expect(r2.success).toBe(true)

    const r3 = check('ip-a')
    expect(r3.success).toBe(false)
  })

  it('resets after the time window', () => {
    vi.useFakeTimers()
    const check = rateLimit({ maxRequests: 1, windowMs: 1_000 })

    check('timer-ip')
    const blocked = check('timer-ip')
    expect(blocked.success).toBe(false)

    vi.advanceTimersByTime(1_100)

    const allowed = check('timer-ip')
    expect(allowed.success).toBe(true)

    vi.useRealTimers()
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(headers)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('returns unknown when no IP headers present', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })
})

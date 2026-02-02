import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatTimeAgo, formatDuration, cn, getSeverityColor, getStatusColor } from '@/lib/utils'

describe('formatTimeAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Nå" for times less than 1 minute ago', () => {
    const now = new Date()
    expect(formatTimeAgo(now.toISOString())).toBe('Nå')
  })

  it('returns minutes for times less than 1 hour ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:30:00Z'))
    expect(formatTimeAgo('2026-01-15T12:25:00Z')).toBe('5 min siden')
    vi.useRealTimers()
  })

  it('returns hours for times less than 24 hours ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T15:00:00Z'))
    expect(formatTimeAgo('2026-01-15T12:00:00Z')).toBe('3 t siden')
    vi.useRealTimers()
  })

  it('returns days for times less than 7 days ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
    expect(formatTimeAgo('2026-01-13T12:00:00Z')).toBe('2 d siden')
    vi.useRealTimers()
  })
})

describe('formatDuration', () => {
  it('formats minutes', () => {
    expect(formatDuration('2026-01-15T12:00:00Z', '2026-01-15T12:45:00Z')).toBe('45 min')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration('2026-01-15T12:00:00Z', '2026-01-15T14:30:00Z')).toBe('2t 30m')
  })

  it('formats days', () => {
    expect(formatDuration('2026-01-15T12:00:00Z', '2026-01-17T14:00:00Z')).toBe('2d 2t')
  })

  it('returns dash for negative duration', () => {
    expect(formatDuration('2026-01-15T12:00:00Z', '2026-01-14T12:00:00Z')).toBe('-')
  })
})

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})

describe('getSeverityColor', () => {
  it('returns correct colors for each severity', () => {
    expect(getSeverityColor('kritisk')).toContain('red')
    expect(getSeverityColor('høy')).toContain('orange')
    expect(getSeverityColor('middels')).toContain('yellow')
    expect(getSeverityColor('lav')).toContain('green')
    expect(getSeverityColor('unknown')).toContain('gray')
  })
})

describe('getStatusColor', () => {
  it('returns blue classes for pågår', () => {
    expect(getStatusColor('pågår')).toContain('blue')
  })

  it('returns gray classes for avsluttet', () => {
    expect(getStatusColor('avsluttet')).toContain('gray')
  })
})

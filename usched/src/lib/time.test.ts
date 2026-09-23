import { describe, expect, it } from 'vitest'
import { describeMeetings, format12, formatMinutes, timeAgo, toMinutes } from './time'

describe('time helpers', () => {
  it('converts and formats times', () => {
    expect(toMinutes('08:30')).toBe(510)
    expect(format12('00:00')).toBe('12:00 AM')
    expect(format12('13:05')).toBe('1:05 PM')
    expect(formatMinutes(0)).toBe('None')
    expect(formatMinutes(95)).toBe('1h 35m')
  })

  it('describes relative time', () => {
    const now = Date.parse('2026-09-21T12:00:00Z')
    expect(timeAgo('2026-09-21T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-09-21T11:30:00Z', now)).toBe('30 min ago')
    expect(timeAgo('2026-09-21T06:00:00Z', now)).toBe('6 h ago')
  })

  it('groups meetings that share a time', () => {
    const lines = describeMeetings([
      { day: 'MON', start: '08:00', end: '09:30', room: 'LB 201', type: 'LECTURE' },
      { day: 'WED', start: '08:00', end: '09:30', room: 'LB 201', type: 'LECTURE' },
      { day: 'SAT', start: '13:00', end: '16:00', room: null, type: 'LAB' },
    ])
    expect(lines).toEqual(['Mon/Wed 8:00 AM – 9:30 AM · LB 201', 'Sat Lab 1:00 PM – 4:00 PM'])
  })
})

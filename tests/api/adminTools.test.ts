import { describe, expect, it } from 'vitest'
import { IsmisAuthenticationError, IsmisChallengeError, IsmisLayoutChangedError, IsmisNoResultsError, IsmisUnavailableError } from '@/server/errors'
import { failureKind, healthStatus } from '@/server/services/ismisHealth'
import { ismisSessions } from '@/server/services/ismisSessions'
import { setAnnouncement } from '@/server/services/announcement'
import { usedPreferences } from '@/server/services/usage'

const now = new Date('2026-11-20T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms)
const MIN = 60_000

describe('ISMIS health', () => {
  it('names failures by kind, and ignores errors that are not ISMIS being broken', () => {
    expect(failureKind(new IsmisLayoutChangedError('x'))).toBe('LAYOUT_CHANGED')
    expect(failureKind(new IsmisChallengeError('x'))).toBe('CHALLENGE')
    expect(failureKind(new IsmisUnavailableError('x'))).toBe('UNAVAILABLE')
    expect(failureKind(new IsmisAuthenticationError('x'))).toBe('AUTH_FAILED')
    expect(failureKind(new IsmisNoResultsError('x'))).toBeNull()
    expect(failureKind(new Error('x'))).toBeNull()
  })

  it('is healthy with no failures, and wrong passwords never count against ISMIS', () => {
    expect(healthStatus([], now)).toBe('healthy')
    expect(healthStatus(Array.from({ length: 20 }, () => ({ kind: 'AUTH_FAILED', occurredAt: ago(MIN) })), now)).toBe('healthy')
  })

  it('is broken when the layout changed in the last 24 hours, but not a week ago', () => {
    expect(healthStatus([{ kind: 'LAYOUT_CHANGED', occurredAt: ago(23 * 60 * MIN) }], now)).toBe('broken')
    expect(healthStatus([{ kind: 'LAYOUT_CHANGED', occurredAt: ago(25 * 60 * MIN) }], now)).toBe('healthy')
  })

  it('is degraded after three unreachable or CAPTCHA failures within an hour', () => {
    const e = (kind: string, m: number) => ({ kind, occurredAt: ago(m * MIN) })
    expect(healthStatus([e('UNAVAILABLE', 5), e('CHALLENGE', 10), e('UNAVAILABLE', 20)], now)).toBe('degraded')
    expect(healthStatus([e('UNAVAILABLE', 5), e('UNAVAILABLE', 10)], now)).toBe('healthy')
    expect(healthStatus([e('UNAVAILABLE', 5), e('UNAVAILABLE', 10), e('UNAVAILABLE', 90)], now)).toBe('healthy')
  })
})

describe('usage counting', () => {
  it('records which kinds of preference were used, never their values', () => {
    expect(usedPreferences(null)).toEqual([])
    expect(usedPreferences({ hard: { avoidDays: ['SAT'], earliestStart: '08:00', maxSchoolDays: 4 }, soft: { minimizeGaps: true, preferredInstructorIds: [7] } }))
      .toEqual(['maxSchoolDays', 'earliestStart', 'avoidDays', 'minimizeGaps', 'preferredInstructors'])
    expect(usedPreferences({ hard: { avoidDays: [], minBreakMinutes: 0, avoidInstructorIds: [] }, soft: { preferMorning: false } })).toEqual([])
    expect(JSON.stringify(usedPreferences({ hard: { earliestStart: '07:30' } }))).not.toContain('07:30')
  })
})

describe('announcement rules', () => {
  it('refuses a bad look, an over-long message, or switching on a blank one, before touching the database', async () => {
    await expect(setAnnouncement('hi', 'loud', false)).rejects.toThrow(/info or warning/)
    await expect(setAnnouncement('x'.repeat(281), 'info', false)).rejects.toThrow(/280/)
    await expect(setAnnouncement('   ', 'info', true)).rejects.toThrow(/Write a message/)
  })
})

describe('ending sessions', () => {
  it('signs out every session a student has, and only theirs', () => {
    const s = ismisSessions()
    const a1 = s.seedTestSession('111')
    s.seedTestSession('111')
    const b = s.seedTestSession('222')
    expect(s.endForStudent('111')).toBe(2)
    expect(() => s.identify(a1)).toThrow()
    expect(s.identify(b)).toBe('222')
    expect(s.endForStudent('999')).toBe(0)
    s.endForStudent('222')
  })
})

import { describe, expect, it } from 'vitest'
import type { Section } from '../api/types'
import { decodeSchedule, encodeSchedule } from './shareSchedule'

const sections: Section[] = [
  { sectionId: 101, courseCode: 'CIS 2105', courseName: 'Networking II — Ñandú', units: 3, sectionCode: 'A',
    instructorId: 7, instructor: 'Dr. Cruz', availableSlots: 4,
    meetings: [{ day: 'MON', start: '08:00', end: '09:30', room: 'LB 1', type: 'LECTURE' },
      { day: 'WED', start: '13:00', end: '16:00', room: null, type: 'LAB' }] },
]
const shared = { semester: '2ND' as const, academicYear: '2026-2027', sections }

describe('share links', () => {
  it('round-trips a schedule, keeping only what the calendar needs', () => {
    const decoded = decodeSchedule(encodeSchedule(shared))
    expect(decoded?.semester).toBe('2ND')
    expect(decoded?.academicYear).toBe('2026-2027')
    expect(decoded?.sections[0]).toMatchObject({ courseCode: 'CIS 2105', courseName: 'Networking II — Ñandú',
      sectionCode: 'A', instructor: 'Dr. Cruz', units: 3, instructorId: null, availableSlots: null })
    expect(decoded?.sections[0].meetings).toEqual(sections[0].meetings)
  })

  it('is url-safe', () => {
    expect(encodeSchedule(shared)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('rejects garbage, truncated links and malformed content', () => {
    const good = encodeSchedule(shared)
    expect(decodeSchedule('')).toBeNull()
    expect(decodeSchedule('not base64!!')).toBeNull()
    expect(decodeSchedule(good.slice(0, good.length - 12))).toBeNull()
    const forge = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
    expect(decodeSchedule(forge({ v: 2, s: '1ST', y: '2026-2027', c: [] }))).toBeNull()
    expect(decodeSchedule(forge({ v: 1, s: '1ST', y: '2026-2027', c: [['X', 'Y', 3, 'A', null, [['FUNDAY', '08:00', '09:00', null, 'LECTURE']]]] }))).toBeNull()
    expect(decodeSchedule(forge({ v: 1, s: '1ST', y: '2026-2027', c: [['X', 'Y', 3, 'A', null, [['MON', '8am', '9am', null, 'LECTURE']]]] }))).toBeNull()
  })
})

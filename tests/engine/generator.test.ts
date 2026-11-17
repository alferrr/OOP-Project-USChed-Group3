// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { constraintsFrom } from '@/server/engine/constraints'
import { generateSchedules } from '@/server/engine/generator'
import { NO_PREFERENCE, preference } from '@/server/engine/preference'
import { ScheduleValidator } from '@/server/engine/validator'
import { NoValidScheduleError } from '@/server/errors'
import { hm } from '@/server/domain/time'
import { course, courseWithSlots, lecture, lectureOn, section } from '../support/fixtures'

const noRules = new ScheduleValidator([])

describe('generateSchedules', () => {
  it('returns every combination with one section per course and no conflicts', () => {
    // 3 x 2 x 4 x 3 = 72 raw combinations on non-overlapping-per-course slots
    const result = generateSchedules(
      [courseWithSlots('A 1', 3, 7), courseWithSlots('B 1', 2, 10), courseWithSlots('C 1', 4, 12), courseWithSlots('D 1', 3, 16)],
      noRules,
      500,
    )
    expect(result).toHaveLength(72)
    for (const s of result) {
      expect(s.sections).toHaveLength(4)
      expect(s.hasConflict()).toBe(false)
    }
  })

  it('prunes conflicting branches', () => {
    const a = course('A 1', section('A 1', 'A', lecture('MON', '08:00', '09:30')), section('A 1', 'B', lecture('MON', '10:30', '12:00')))
    const b = course('B 1', section('B 1', 'A', lecture('MON', '09:00', '10:30')))
    // A-A conflicts with B-A; A-B is the only valid pairing.
    const result = generateSchedules([a, b], noRules, 500)
    expect(result).toHaveLength(1)
    expect(result[0].sections.map((x) => x.courseCode + x.sectionCode).sort()).toEqual(['A 1B', 'B 1A'])
  })

  it('respects the limit', () => {
    expect(generateSchedules([courseWithSlots('A 1', 4, 7), courseWithSlots('B 1', 4, 12)], noRules, 5)).toHaveLength(5)
  })

  it('explains an impossible case', () => {
    const a = course('A 1', section('A 1', 'A', lecture('MON', '08:00', '09:30')))
    const b = course('B 1', section('B 1', 'A', lecture('MON', '09:00', '10:30')))
    try {
      generateSchedules([a, b], noRules, 10)
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(NoValidScheduleError)
      expect((e as NoValidScheduleError).details[0]).toContain('A 1')
      expect((e as NoValidScheduleError).details[0]).toContain('B 1')
    }
  })

  it('says which courses have no sections', () => {
    expect(() => generateSchedules([course('A 1')], noRules, 10)).toThrow(NoValidScheduleError)
  })

  it('discards a too-tight same-day campus switch even with no preferences set', () => {
    // A-A (Talamban, ends 9:00) back-to-back with B-A (Main, starts 9:00) is physically impossible;
    // A-B leaves a real gap, so only the pairing through A-B should survive.
    const a = course(
      'A 1',
      section('A 1', 'A', lectureOn('Talamban', 'MON', '07:30', '09:00')),
      section('A 1', 'B', lectureOn('Talamban', 'MON', '06:00', '08:00')),
    )
    const b = course('B 1', section('B 1', 'A', lectureOn('Main', 'MON', '09:00', '10:00')))
    const validator = new ScheduleValidator(constraintsFrom(NO_PREFERENCE))
    const result = generateSchedules([a, b], validator, 10)
    expect(result).toHaveLength(1)
    expect(result[0].sections.map((x) => x.courseCode + x.sectionCode)).toContain('A 1B')
  })

  it('hard constraints discard schedules', () => {
    const a = course('A 1', section('A 1', 'A', lecture('MON', '07:00', '08:00')), section('A 1', 'B', lecture('MON', '10:00', '11:00')))
    const validator = new ScheduleValidator(constraintsFrom(preference({ earliestStart: hm(9) })))
    const result = generateSchedules([a], validator, 10)
    expect(result).toHaveLength(1)
    expect(result[0].sections[0].sectionCode).toBe('B')
  })
})

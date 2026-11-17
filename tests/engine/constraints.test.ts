// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { Schedule } from '@/server/domain/model'
import { hm } from '@/server/domain/time'
import {
  AvoidDaysConstraint,
  AvoidInstructorsConstraint,
  CampusTravelConstraint,
  EarliestStartConstraint,
  LatestEndConstraint,
  MaxClassesPerDayConstraint,
  MaxSchoolDaysConstraint,
  MinBreakConstraint,
  TRAVEL_MINUTES,
  constraintsFrom,
  type ScheduleConstraint,
} from '@/server/engine/constraints'
import { NO_PREFERENCE, preference } from '@/server/engine/preference'
import { lecture, lectureOn, section } from '../support/fixtures'

const schedule = Schedule.of([
  section('A 1', 'A', lecture('MON', '08:00', '09:00')),
  section('B 1', 'A', lecture('MON', '09:30', '10:30'), lecture('SAT', '13:00', '14:00')),
])

function check(passes: ScheduleConstraint, fails: ScheduleConstraint) {
  expect(passes.isSatisfiedBy(schedule)).toBe(true)
  expect(fails.isSatisfiedBy(schedule)).toBe(false)
  expect(fails.description().trim()).not.toBe('')
}

describe('hard constraints', () => {
  it('maxSchoolDays', () => check(new MaxSchoolDaysConstraint(2), new MaxSchoolDaysConstraint(1)))
  it('maxClassesPerDay', () => check(new MaxClassesPerDayConstraint(2), new MaxClassesPerDayConstraint(1)))
  it('minBreak', () => check(new MinBreakConstraint(30), new MinBreakConstraint(45)))
  it('earliestStart', () => check(new EarliestStartConstraint(hm(8)), new EarliestStartConstraint(hm(9))))
  it('latestEnd', () => check(new LatestEndConstraint(hm(14)), new LatestEndConstraint(hm(13))))
  it('avoidDays', () => check(new AvoidDaysConstraint(new Set(['FRI'])), new AvoidDaysConstraint(new Set(['SAT']))))
})

describe('AvoidInstructorsConstraint', () => {
  const taught = (id: number | null) =>
    Schedule.of([section('A 1', 'A', id === null ? null : { id, name: `T${id}` }, lecture('MON', '08:00', '09:00'))])

  it('rejects a schedule with an avoided instructor and keeps others, including unassigned sections', () => {
    const c = new AvoidInstructorsConstraint(new Set([5]))
    expect(c.isSatisfiedBy(taught(5))).toBe(false)
    expect(c.isSatisfiedBy(taught(6))).toBe(true)
    expect(c.isSatisfiedBy(taught(null))).toBe(true)
  })

  it('is added by constraintsFrom only when instructors are avoided', () => {
    const has = (p: Parameters<typeof constraintsFrom>[0]) => constraintsFrom(p).some((c) => c instanceof AvoidInstructorsConstraint)
    expect(has(NO_PREFERENCE)).toBe(false)
    expect(has(preference({ avoidInstructorIds: new Set([5]) }))).toBe(true)
  })
})

describe('CampusTravelConstraint', () => {
  const constraint = new CampusTravelConstraint()

  it('mirrors the UI: the travel buffer is 45 minutes', () => {
    // src/lib/insights.ts duplicates this value; change both together.
    expect(TRAVEL_MINUTES).toBe(45)
  })

  it('rejects a too-tight same-day switch of campus', () => {
    const tooTight = Schedule.of([
      section('A 1', 'A', lectureOn('Talamban', 'MON', '07:30', '09:00')),
      section('B 1', 'A', lectureOn('Main', 'MON', '09:00', '10:00')),
    ])
    expect(constraint.isSatisfiedBy(tooTight)).toBe(false)
    expect(constraint.description().trim()).not.toBe('')
  })

  it('accepts a campus switch with enough time', () => {
    expect(
      constraint.isSatisfiedBy(
        Schedule.of([
          section('A 1', 'A', lectureOn('Talamban', 'MON', '07:30', '09:00')),
          section('B 1', 'A', lectureOn('Main', 'MON', '09:45', '10:45')),
        ]),
      ),
    ).toBe(true)
  })

  it('does not mind back-to-back classes on the same campus', () => {
    expect(
      constraint.isSatisfiedBy(
        Schedule.of([
          section('A 1', 'A', lectureOn('Talamban', 'MON', '07:30', '09:00')),
          section('B 1', 'A', lectureOn('Talamban', 'MON', '09:00', '10:00')),
        ]),
      ),
    ).toBe(true)
  })

  it('cannot blame a class whose room is unknown', () => {
    expect(
      constraint.isSatisfiedBy(
        Schedule.of([
          section('A 1', 'A', lectureOn('Talamban', 'MON', '07:30', '09:00')),
          section('B 1', 'A', lecture('MON', '09:00', '10:00')),
        ]),
      ),
    ).toBe(true)
  })
})

describe('constraintsFrom', () => {
  it('always includes the campus travel rule, even with no preferences', () => {
    expect(constraintsFrom(NO_PREFERENCE)).toHaveLength(1)
    expect(constraintsFrom(NO_PREFERENCE)[0]).toBeInstanceOf(CampusTravelConstraint)
  })

  it('adds one constraint per hard preference that is set', () => {
    const list = constraintsFrom(
      preference({ maxSchoolDays: 3, minBreakMinutes: 0, earliestStart: hm(9), avoidDays: new Set(['FRI'] as const) }),
    )
    // travel + maxSchoolDays + earliestStart + avoidDays (a 0-minute break is no constraint)
    expect(list).toHaveLength(4)
  })
})

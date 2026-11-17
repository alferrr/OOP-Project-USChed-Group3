// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { Schedule } from '@/server/domain/model'
import { NO_PREFERENCE, preference } from '@/server/engine/preference'
import {
  AbstractScoringStrategy,
  CampusConsistencyStrategy,
  CompactScheduleStrategy,
  InstructorPreferenceStrategy,
  LunchBreakStrategy,
  MinimalDaysStrategy,
  MorningPreferenceStrategy,
  ScheduleScorer,
  defaultScorer,
  type ScoringStrategy,
} from '@/server/engine/scoring'
import { instructor } from '@/server/domain/model'
import { lecture, lectureOn, section, sectionWithId } from '../support/fixtures'

const none = NO_PREFERENCE
const tight = Schedule.of([section('A 1', 'A', lecture('MON', '08:00', '09:00')), section('B 1', 'A', lecture('MON', '09:00', '10:00'))])
const spread = Schedule.of([section('A 1', 'A', lecture('MON', '13:00', '14:00')), section('B 1', 'A', lecture('WED', '16:00', '17:00'))])

describe('scoring strategies', () => {
  it('every strategy stays in the unit range', () => {
    const all = [new CompactScheduleStrategy(), new MorningPreferenceStrategy(), new MinimalDaysStrategy(), new InstructorPreferenceStrategy()]
    for (const s of all) for (const sch of [tight, spread]) {
      const v = s.score(sch, none)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('compact prefers fewer gaps', () => {
    const gappy = Schedule.of([section('A 1', 'A', lecture('MON', '08:00', '09:00')), section('B 1', 'A', lecture('MON', '15:00', '16:00'))])
    expect(new CompactScheduleStrategy().score(tight, none)).toBeGreaterThan(new CompactScheduleStrategy().score(gappy, none))
  })

  it('morning direction is configurable', () => {
    const morning = new MorningPreferenceStrategy()
    expect(morning.score(tight, none)).toBe(1)
    expect(morning.score(spread, none)).toBe(0)
    expect(morning.score(tight, preference({ preferAfternoon: true }))).toBe(0)
  })

  it('minimal days prefers fewer days', () => {
    expect(new MinimalDaysStrategy().score(tight, none)).toBe(1)
    expect(new MinimalDaysStrategy().score(spread, none)).toBeLessThan(1)
  })

  it('instructor preference counts preferred sections', () => {
    const s = Schedule.of([
      section('A 1', 'A', instructor(4, 'Juan Dela Cruz'), lecture('MON', '08:00', '09:00')),
      section('B 1', 'A', lecture('TUE', '08:00', '09:00')),
    ])
    expect(new InstructorPreferenceStrategy().score(s, preference({ preferredInstructorIds: new Set([4]) }))).toBe(0.5)
  })

  it('the template method clamps out-of-range values', () => {
    const scorer = new ScheduleScorer([wild(7.5), wild(-3, 'Neg'), wild(Number.NaN, 'NaN')])
    expect(scorer.score(tight, none).breakdown).toEqual({ Wild: 1, Neg: 0, NaN: 0 })
  })

  it('weights change the ranking', () => {
    const scorer = defaultScorer()
    // tight is compact but morning-only; spread is afternoon. Preferring afternoon must flip the order.
    const neutral = scorer.rank([tight, spread], none, 10)
    expect(neutral[0].schedule).toBe(tight)
    expect(neutral[0].breakdown).not.toHaveProperty('Instructor')
    const pm = preference({ preferAfternoon: true, preferredInstructorIds: new Set([9]) })
    const afternoon = scorer.rank([tight, spread], pm, 10)
    expect(afternoon[0].score).toBeGreaterThanOrEqual(0)
    expect(afternoon[0].score).toBeLessThanOrEqual(100)
    expect(Object.keys(afternoon[0].breakdown)).toEqual(expect.arrayContaining(['Compact', 'Morning', 'MinimalDays', 'Instructor']))
  })

  it('a new strategy needs no scorer change', () => {
    expect(new ScheduleScorer([wild(1, 'One')]).score(tight, none).score).toBe(100)
  })

  it('truncates the ranking to topN', () => {
    expect(defaultScorer().rank([tight, spread], none, 1)).toHaveLength(1)
  })
})

/** A strategy that returns whatever raw value it is told to, to exercise the template method's clamping. */
function wild(value: number, name = 'Wild'): ScoringStrategy {
  return new (class extends AbstractScoringStrategy {
    name = () => name
    weight = () => 1
    protected computeRaw = () => value
  })()
}

describe('CampusConsistencyStrategy', () => {
  const strategy = new CampusConsistencyStrategy()

  it('every section on one campus scores perfect', () => {
    const s = Schedule.of([
      section('A 1', 'A', lectureOn('Talamban', 'MON', '08:00', '09:30')),
      section('B 1', 'A', lectureOn('Talamban', 'TUE', '10:00', '11:30')),
    ])
    expect(strategy.score(s, none)).toBe(1)
  })

  it('one section on the other campus drags the score down', () => {
    const s = Schedule.of([
      section('A 1', 'A', lectureOn('Talamban', 'MON', '08:00', '09:30')),
      section('B 1', 'A', lectureOn('Talamban', 'TUE', '10:00', '11:30')),
      section('C 1', 'A', lectureOn('Main', 'WED', '08:00', '09:30')),
    ])
    expect(strategy.score(s, none)).toBe(2 / 3)
  })

  it('an even split scores half', () => {
    const s = Schedule.of([
      section('A 1', 'A', lectureOn('Talamban', 'MON', '08:00', '09:30')),
      section('B 1', 'A', lectureOn('Main', 'TUE', '10:00', '11:30')),
    ])
    expect(strategy.score(s, none)).toBe(0.5)
  })

  it('sections with no known room are not penalised', () => {
    expect(strategy.score(Schedule.of([section('A 1', 'A', lecture('MON', '08:00', '09:30'))]), none)).toBe(1)
  })

  it("a section's campus is whichever its own meetings mostly agree on", () => {
    const s = Schedule.of([
      section('A 1', 'A', lectureOn('Talamban', 'MON', '08:00', '09:30'), lectureOn('Talamban', 'WED', '08:00', '09:30')),
      section('B 1', 'A', lectureOn('Talamban', 'TUE', '10:00', '11:30')),
    ])
    expect(strategy.score(s, none)).toBe(1)
  })

  it('is on by default and weighted heavily', () => {
    const ranked = defaultScorer().rank([Schedule.of([section('A 1', 'A', lectureOn('Main', 'MON', '10:00', '11:30'))])], none, 1)
    expect(ranked[0].breakdown).toHaveProperty('CampusConsistency')
    expect(strategy.weight()).toBeGreaterThan(1)
  })

  it('the best-ranked schedule keeps everything on the majority campus', () => {
    const allTalamban = Schedule.of([
      section('A 1', 'A', lectureOn('Talamban', 'MON', '08:00', '09:30')),
      section('B 1', 'A', lectureOn('Talamban', 'TUE', '10:00', '11:30')),
      section('C 1', 'A', lectureOn('Talamban', 'WED', '13:00', '14:30')),
    ])
    const oneStrayed = Schedule.of([
      section('A 1', 'B', lectureOn('Talamban', 'MON', '08:00', '09:30')),
      section('B 1', 'B', lectureOn('Talamban', 'TUE', '10:00', '11:30')),
      section('C 1', 'B', lectureOn('Main', 'WED', '13:00', '14:30')),
    ])
    expect(defaultScorer().rank([oneStrayed, allTalamban], none, 10)[0].schedule).toBe(allTalamban)
  })
})

describe('LunchBreakStrategy', () => {
  const strategy = new LunchBreakStrategy()
  const day = (...ms: ReturnType<typeof lecture>[]) => Schedule.of(ms.map((m, i) => section(`C ${i}`, 'A', m)))

  it('a free hour around noon counts', () => {
    expect(strategy.score(day(lecture('MON', '10:00', '11:30'), lecture('MON', '13:00', '14:30')), none)).toBe(1)
  })

  it('back-to-back classes through lunch score zero', () => {
    expect(strategy.score(day(lecture('MON', '10:00', '12:30'), lecture('MON', '13:00', '14:30')), none)).toBe(0)
  })

  it('exactly one hour free still counts', () => {
    expect(strategy.score(day(lecture('MON', '10:00', '12:00'), lecture('MON', '13:00', '14:30')), none)).toBe(1)
  })

  it('a day free of classes during the window counts', () => {
    expect(strategy.score(day(lecture('MON', '07:00', '09:00'), lecture('MON', '16:00', '17:00')), none)).toBe(1)
  })

  it('the score is the fraction of school days with a break', () => {
    const s = Schedule.of([
      section('A 1', 'A', lecture('MON', '10:00', '12:30'), lecture('TUE', '13:00', '14:30')),
      section('B 1', 'A', lecture('MON', '13:00', '14:00'), lecture('TUE', '16:00', '17:00')),
    ])
    // Monday: back-to-back through lunch (no break). Tuesday: free 11:00-13:00 (break).
    expect(strategy.score(s, none)).toBe(0.5)
  })

  it('a schedule with no classes at all scores perfect', () => {
    expect(strategy.score(Schedule.of([]), none)).toBe(1)
  })

  it('is on by default and weighs more when prioritised', () => {
    const ranked = defaultScorer().rank([day(lecture('MON', '10:00', '11:30'))], none, 1)
    expect(ranked[0].breakdown).toHaveProperty('LunchBreak')
    expect(strategy.weight(none)).toBeGreaterThan(1) // outweighs Compact's usual preference for zero gaps
    expect(strategy.weight(preference({ prioritizeLunchBreak: true }))).toBeGreaterThan(strategy.weight(none))
  })

  it('with no preferences set, the best-ranked schedule has a lunch break', () => {
    const withBreak = day(lecture('MON', '10:00', '11:30'), lecture('MON', '13:00', '14:30'))
    // Genuinely no break: back-to-back straight through the whole lunch window, not just one short class.
    const noBreak = day(lecture('MON', '10:00', '12:30'), lecture('MON', '12:30', '14:30'))
    expect(strategy.score(noBreak, none)).toBe(0)
    expect(defaultScorer().rank([noBreak, withBreak], none, 10)[0].schedule).toBe(withBreak)
  })
})

describe('ranking diversity', () => {
  const scorer = defaultScorer()

  it('keeps only one schedule of each distinct weekly shape', () => {
    // Two electives that happen to occupy the exact same day/time: to the student these look identical.
    const a = Schedule.of([section('MATH 1', 'A', lecture('MON', '08:00', '09:00')), section('ELEC A', '1', lecture('TUE', '10:00', '11:00'))])
    const b = Schedule.of([section('MATH 1', 'A', lecture('MON', '08:00', '09:00')), section('ELEC B', '1', lecture('TUE', '10:00', '11:00'))])
    const c = Schedule.of([section('MATH 1', 'A', lecture('MON', '08:00', '09:00')), section('ELEC C', '1', lecture('WED', '13:00', '14:00'))])
    const ranked = scorer.rank([a, b, c], none, 10)
    expect(ranked).toHaveLength(2) // a and b collapse into one; c stays
    expect(ranked.some((r) => r.schedule.sections.some((s) => s.courseCode === 'ELEC C'))).toBe(true)
  })

  it('never returns more than topN even after deduplication', () => {
    const mk = (code: string, day: 'MON' | 'TUE' | 'WED') => Schedule.of([section('MATH 1', code, lecture(day, '08:00', '09:00'))])
    expect(scorer.rank([mk('A', 'MON'), mk('B', 'TUE'), mk('C', 'WED')], none, 2)).toHaveLength(2)
  })

  it('rankBySimilarity orders by overlap with the reference first', () => {
    // Reference: sections 1 (MATH) and 2 (ENG).
    const closer = Schedule.of([
      sectionWithId(1, 'MATH 1', 'A', lecture('MON', '08:00', '09:00')), // shares MATH
      sectionWithId(30, 'ENG 1', 'B', lecture('WED', '10:00', '11:00')),
    ])
    // Shares nothing with the reference, but scores higher on every strategy.
    const farther = Schedule.of([
      sectionWithId(40, 'MATH 1', 'Z', lecture('THU', '10:00', '11:00')),
      sectionWithId(41, 'ENG 1', 'Z', lecture('THU', '13:00', '14:00')),
    ])
    expect(scorer.rankBySimilarity([closer, farther], none, new Set([1, 2]), 10)[0].schedule).toBe(closer)
  })

  it('rankBySimilarity excludes the reference schedule itself', () => {
    const reference = Schedule.of([sectionWithId(1, 'MATH 1', 'A', lecture('MON', '08:00', '09:00'))])
    expect(scorer.rankBySimilarity([reference], none, new Set([1]), 10)).toEqual([])
  })
})

import type { Day, Meeting, RankedSchedule, Schedule, Section } from '../domain/model'
import { durationMinutes, hm, NOON, type Minutes } from '../domain/time'
import type { SchedulePreference } from './preference'

export interface ScoringStrategy {
  name(): string
  /** 0.0 (worst) to 1.0 (best). Always clamped. */
  score(schedule: Schedule, prefs: SchedulePreference): number
  /** Relative weight in the final average; 0 disables the strategy for these preferences. */
  weight(prefs: SchedulePreference): number
}

/** Template Method: score() is fixed (NaN -> 0, clamp to 0..1); subclasses supply computeRaw(). */
export abstract class AbstractScoringStrategy implements ScoringStrategy {
  abstract name(): string
  abstract weight(prefs: SchedulePreference): number
  protected abstract computeRaw(schedule: Schedule, prefs: SchedulePreference): number

  score(schedule: Schedule, prefs: SchedulePreference): number {
    const raw = this.computeRaw(schedule, prefs)
    if (Number.isNaN(raw)) return 0
    return Math.max(0, Math.min(1, raw))
  }
}

export class CompactScheduleStrategy extends AbstractScoringStrategy {
  name() {
    return 'Compact'
  }
  protected computeRaw(schedule: Schedule) {
    return 1 / (1 + schedule.totalGapMinutes() / 120)
  }
  weight(prefs: SchedulePreference) {
    return prefs.minimizeGaps ? 2 : 1
  }
}

/** Share of class time before noon; inverted when the student prefers afternoons. */
export class MorningPreferenceStrategy extends AbstractScoringStrategy {
  name() {
    return 'Morning'
  }
  protected computeRaw(schedule: Schedule, prefs: SchedulePreference) {
    let morning = 0
    let total = 0
    for (const section of schedule.sections) {
      for (const m of section.meetings) {
        total += durationMinutes(m.time)
        const end = Math.min(m.time.end, NOON)
        if (m.time.start < NOON) morning += end - m.time.start
      }
    }
    if (total === 0) return 0.5
    const fraction = morning / total
    return prefs.preferAfternoon ? 1 - fraction : fraction
  }
  weight(prefs: SchedulePreference) {
    return prefs.preferMorning || prefs.preferAfternoon ? 2 : 1
  }
}

export class MinimalDaysStrategy extends AbstractScoringStrategy {
  name() {
    return 'MinimalDays'
  }
  protected computeRaw(schedule: Schedule) {
    const days = schedule.schoolDays().length
    return days <= 1 ? 1 : 1 - (days - 1) / 5
  }
  weight(prefs: SchedulePreference) {
    return prefs.minimizeDays ? 2 : 1
  }
}

export class InstructorPreferenceStrategy extends AbstractScoringStrategy {
  name() {
    return 'Instructor'
  }
  protected computeRaw(schedule: Schedule, prefs: SchedulePreference) {
    if (schedule.sections.length === 0 || prefs.preferredInstructorIds.size === 0) return 0.5
    const hits = schedule.sections.filter((s) => {
      const id = s.instructor?.id
      return id !== null && id !== undefined && prefs.preferredInstructorIds.has(id)
    }).length
    return hits / schedule.sections.length
  }
  weight(prefs: SchedulePreference) {
    return prefs.preferredInstructorIds.size === 0 ? 0 : 2
  }
}

/**
 * Scores higher the more school days give the student a real midday break. On by default (part of
 * defaultScorer()), so the best schedules have a lunch break even with no preferences set.
 */
const LUNCH_START: Minutes = hm(11)
const LUNCH_END: Minutes = hm(14)
const LUNCH_MIN_BREAK = 60

export class LunchBreakStrategy extends AbstractScoringStrategy {
  name() {
    return 'LunchBreak'
  }
  protected computeRaw(schedule: Schedule) {
    const byDay = schedule.meetingsByDay()
    if (byDay.size === 0) return 1
    const withBreak = [...byDay.values()].filter(hasLunchBreak).length
    return withBreak / byDay.size
  }
  weight(prefs: SchedulePreference) {
    // Heavier than the others by default: a lunch break is a common, concrete want, worth outweighing
    // CompactScheduleStrategy's usual preference for zero gaps when the two disagree.
    return prefs.prioritizeLunchBreak ? 3 : 1.5
  }
}

const clampToLunch = (t: Minutes) => Math.min(Math.max(t, LUNCH_START), LUNCH_END)

/** True if the day has a free, contiguous stretch of at least an hour overlapping 11:00-14:00. */
export function hasLunchBreak(dayMeetings: readonly Meeting[]): boolean {
  let cursor = LUNCH_START
  for (const m of dayMeetings) {
    const start = clampToLunch(m.time.start)
    const end = clampToLunch(m.time.end)
    if (start > cursor && start - cursor >= LUNCH_MIN_BREAK) return true
    if (end > cursor) cursor = end
    if (cursor >= LUNCH_END) return false
  }
  return LUNCH_END - cursor >= LUNCH_MIN_BREAK
}

/**
 * USC has two physical campuses (Main and Talamban); crossing between them mid-week (or mid-day) is a real
 * commute, not just a room change. Scores higher the more of the schedule's sections sit on a single,
 * shared campus - so if most of a student's courses land in Talamban, the best-ranked schedules keep the
 * rest there too instead of scattering a couple of sections onto Main. On by default, weighted heavily.
 */
export class CampusConsistencyStrategy extends AbstractScoringStrategy {
  name() {
    return 'CampusConsistency'
  }
  protected computeRaw(schedule: Schedule) {
    const counts = new Map<string, number>()
    for (const s of schedule.sections) {
      const campus = sectionCampus(s)
      if (campus !== null) counts.set(campus, (counts.get(campus) ?? 0) + 1)
    }
    if (counts.size === 0) return 1 // no room data to go on (e.g. every meeting is TBA): nothing to penalise
    const known = [...counts.values()].reduce((a, b) => a + b, 0)
    return Math.max(...counts.values()) / known
  }
  weight() {
    return 2.5
  }
}

/** The campus most of a section's own meetings are held on, or null if none of them name a room. */
function sectionCampus(section: Section): string | null {
  const counts = new Map<string, number>()
  for (const m of section.meetings) {
    const campus = m.room?.campus
    if (campus) counts.set(campus, (counts.get(campus) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [campus, n] of counts) {
    if (n > bestCount) {
      best = campus
      bestCount = n
    }
  }
  return best
}

const round = (v: number, places: number) => {
  const f = 10 ** places
  return Math.round(v * f) / f
}

/** Weighted average of enabled strategies, scaled 0-100. Adding a strategy needs no change here. */
export class ScheduleScorer {
  private readonly strategies: readonly ScoringStrategy[]

  constructor(strategies: readonly ScoringStrategy[]) {
    this.strategies = [...strategies]
  }

  score(schedule: Schedule, prefs: SchedulePreference): RankedSchedule {
    const breakdown: Record<string, number> = {}
    let weighted = 0
    let totalWeight = 0
    for (const strategy of this.strategies) {
      const w = strategy.weight(prefs)
      if (w <= 0) continue // disabled for these preferences: neither scored nor shown
      const sub = strategy.score(schedule, prefs)
      breakdown[strategy.name()] = round(sub, 2)
      weighted += sub * w
      totalWeight += w
    }
    const score = totalWeight === 0 ? 0 : (weighted / totalWeight) * 100
    return { schedule, score: round(score, 1), breakdown }
  }

  /**
   * Ranked best-first; ties broken by fewer school days, then fewer gap minutes. At most one schedule per
   * distinct weekly time pattern: several section combinations can land on the exact same days and times
   * (e.g. two elective sections that happen to meet at the same hour), and showing all of them as separate
   * "top" results just looks like the same schedule repeated, so only the best-scoring one of each pattern
   * is kept.
   */
  rank(schedules: readonly Schedule[], prefs: SchedulePreference, topN: number): RankedSchedule[] {
    const ranked = schedules.map((s) => this.score(s, prefs))
    ranked.sort(
      (a, b) =>
        b.score - a.score ||
        a.schedule.schoolDays().length - b.schedule.schoolDays().length ||
        a.schedule.totalGapMinutes() - b.schedule.totalGapMinutes(),
    )
    return takeDistinctShapes(ranked, topN)
  }

  /**
   * Ranked by closeness to a reference schedule (most shared sections first, score as the tie-break), for
   * "More like this". The reference schedule itself is excluded: showing the exact same schedule back would
   * not be useful. Still at most one result per distinct weekly time pattern.
   */
  rankBySimilarity(
    schedules: readonly Schedule[],
    prefs: SchedulePreference,
    referenceSectionIds: ReadonlySet<number>,
    topN: number,
  ): RankedSchedule[] {
    const ranked: RankedSchedule[] = []
    for (const s of schedules) {
      const ids = sectionIds(s)
      if (ids.size === referenceSectionIds.size && [...ids].every((id) => referenceSectionIds.has(id))) {
        continue // identical to what the student is already looking at
      }
      ranked.push(this.score(s, prefs))
    }
    const overlap = (r: RankedSchedule) => [...sectionIds(r.schedule)].filter((id) => referenceSectionIds.has(id)).length
    ranked.sort((a, b) => overlap(b) - overlap(a) || b.score - a.score)
    return takeDistinctShapes(ranked, topN)
  }
}

export function defaultScorer(): ScheduleScorer {
  return new ScheduleScorer([
    new CompactScheduleStrategy(),
    new MorningPreferenceStrategy(),
    new MinimalDaysStrategy(),
    new InstructorPreferenceStrategy(),
    new LunchBreakStrategy(),
    new CampusConsistencyStrategy(),
  ])
}

function takeDistinctShapes(ordered: readonly RankedSchedule[], topN: number): RankedSchedule[] {
  const out: RankedSchedule[] = []
  const seen = new Set<string>()
  for (const r of ordered) {
    if (out.length >= topN) break
    const key = weeklyShape(r.schedule).join('|')
    if (!seen.has(key)) {
      seen.add(key)
      out.push(r)
    }
  }
  return out
}

/**
 * The schedule's visual pattern on the weekly calendar: every meeting's day+time, independent of which
 * course or section fills it. Two schedules with the same shape look identical to the student.
 */
function weeklyShape(schedule: Schedule): string[] {
  const slots: string[] = []
  for (const s of schedule.sections) {
    for (const m of s.meetings) slots.push(`${m.day as Day} ${m.time.start}-${m.time.end}`)
  }
  return slots.sort()
}

function sectionIds(schedule: Schedule): Set<number> {
  const ids = new Set<number>()
  for (const s of schedule.sections) if (s.id !== null) ids.add(s.id)
  return ids
}

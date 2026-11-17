import type { Day } from '../domain/model'
import type { Minutes } from '../domain/time'

/**
 * Immutable student preferences. Hard rules discard schedules; soft rules only affect scoring.
 * Each preference is one or the other, never both.
 */
export interface SchedulePreference {
  // Hard
  readonly maxSchoolDays: number | null
  readonly maxClassesPerDay: number | null
  readonly minBreakMinutes: number | null
  readonly earliestStart: Minutes | null
  readonly latestEnd: Minutes | null
  readonly avoidDays: ReadonlySet<Day>
  readonly avoidInstructorIds: ReadonlySet<number>
  // Soft
  readonly preferMorning: boolean
  readonly preferAfternoon: boolean
  readonly minimizeGaps: boolean
  readonly minimizeDays: boolean
  readonly prioritizeLunchBreak: boolean
  readonly preferredInstructorIds: ReadonlySet<number>
}

export function preference(overrides: Partial<SchedulePreference> = {}): SchedulePreference {
  return Object.freeze({
    maxSchoolDays: null,
    maxClassesPerDay: null,
    minBreakMinutes: null,
    earliestStart: null,
    latestEnd: null,
    avoidDays: new Set<Day>(),
    avoidInstructorIds: new Set<number>(),
    preferMorning: false,
    preferAfternoon: false,
    minimizeGaps: false,
    minimizeDays: false,
    prioritizeLunchBreak: false,
    preferredInstructorIds: new Set<number>(),
    ...overrides,
  })
}

export const NO_PREFERENCE: SchedulePreference = preference()

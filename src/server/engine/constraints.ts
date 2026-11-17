import { DAYS, type Day, type Meeting, type Schedule } from '../domain/model'
import { formatTime, type Minutes } from '../domain/time'
import type { SchedulePreference } from './preference'

/**
 * One hard rule. Every implementation is monotone: if a partial schedule violates it,
 * so does any schedule extending it, which lets the generator prune early.
 */
export interface ScheduleConstraint {
  isSatisfiedBy(schedule: Schedule): boolean
  description(): string
}

/** Gap between two consecutive meetings of one day, minutes. */
const gapBetween = (a: Meeting, b: Meeting) => b.time.start - a.time.end

export class AvoidDaysConstraint implements ScheduleConstraint {
  constructor(private readonly days: ReadonlySet<Day>) {}

  isSatisfiedBy(schedule: Schedule): boolean {
    return schedule.schoolDays().every((d) => !this.days.has(d))
  }

  description(): string {
    return `no classes on ${DAYS.filter((d) => this.days.has(d)).join(', ')}`
  }
}

/**
 * USC's two campuses (Main and Talamban) are a real commute apart - roughly half an hour by jeepney in
 * typical Cebu traffic, not a room-to-room walk - so two classes back-to-back (or nearly so) on different
 * campuses the same day is often physically impossible, not just inconvenient. Always on, independent of
 * any preference: unlike MinBreakConstraint (a general minimum gap a student opts into), this specifically
 * targets a same-day campus switch and needs a much larger buffer than an ordinary between-class gap.
 * CampusConsistencyStrategy (soft scoring) still favours keeping everything on one campus when possible;
 * this constraint is the hard floor for whenever it isn't.
 *
 * The required gap is TRAVEL_MINUTES (45): the ~30 minute trip plus a margin for boarding and walking to the
 * room. The UI mirrors this value and the room-suffix campus rule in src/lib/insights.ts; keep them in step
 * (the campus travel test pins the value).
 */
export const TRAVEL_MINUTES = 45

export class CampusTravelConstraint implements ScheduleConstraint {
  isSatisfiedBy(schedule: Schedule): boolean {
    for (const day of schedule.meetingsByDay().values()) {
      for (let i = 1; i < day.length; i++) {
        const prev = day[i - 1].room?.campus ?? null
        const next = day[i].room?.campus ?? null
        if (prev === null || next === null || prev === next) continue // same campus, or unknown: nothing to enforce
        if (gapBetween(day[i - 1], day[i]) < TRAVEL_MINUTES) return false
      }
    }
    return true
  }

  description(): string {
    return `at least ${TRAVEL_MINUTES} minutes to travel between classes on different campuses the same day`
  }
}

export class EarliestStartConstraint implements ScheduleConstraint {
  constructor(private readonly earliest: Minutes) {}

  isSatisfiedBy(schedule: Schedule): boolean {
    const start = schedule.earliestStart()
    return start === null || start >= this.earliest
  }

  description(): string {
    return `no class before ${formatTime(this.earliest)}`
  }
}

export class LatestEndConstraint implements ScheduleConstraint {
  constructor(private readonly latest: Minutes) {}

  isSatisfiedBy(schedule: Schedule): boolean {
    const end = schedule.latestEnd()
    return end === null || end <= this.latest
  }

  description(): string {
    return `no class after ${formatTime(this.latest)}`
  }
}

export class MaxClassesPerDayConstraint implements ScheduleConstraint {
  constructor(private readonly max: number) {}

  isSatisfiedBy(schedule: Schedule): boolean {
    return [...schedule.meetingsByDay().values()].every((day) => day.length <= this.max)
  }

  description(): string {
    return `at most ${this.max} classes per day`
  }
}

export class MaxSchoolDaysConstraint implements ScheduleConstraint {
  constructor(private readonly max: number) {}

  isSatisfiedBy(schedule: Schedule): boolean {
    return schedule.schoolDays().length <= this.max
  }

  description(): string {
    return `at most ${this.max} school days`
  }
}

export class MinBreakConstraint implements ScheduleConstraint {
  constructor(private readonly minutes: number) {}

  isSatisfiedBy(schedule: Schedule): boolean {
    for (const day of schedule.meetingsByDay().values()) {
      for (let i = 1; i < day.length; i++) {
        if (gapBetween(day[i - 1], day[i]) < this.minutes) return false
      }
    }
    return true
  }

  description(): string {
    return `at least ${this.minutes} minutes between classes`
  }
}

/** Turns the hard half of a SchedulePreference into constraint objects. */
export function constraintsFrom(p: SchedulePreference): ScheduleConstraint[] {
  // Always on, regardless of preferences: a same-day campus switch needs real travel time or it is
  // not just a bad schedule, it is an impossible one.
  const list: ScheduleConstraint[] = [new CampusTravelConstraint()]
  if (p.maxSchoolDays !== null) list.push(new MaxSchoolDaysConstraint(p.maxSchoolDays))
  if (p.maxClassesPerDay !== null) list.push(new MaxClassesPerDayConstraint(p.maxClassesPerDay))
  if (p.minBreakMinutes !== null && p.minBreakMinutes > 0) list.push(new MinBreakConstraint(p.minBreakMinutes))
  if (p.earliestStart !== null) list.push(new EarliestStartConstraint(p.earliestStart))
  if (p.latestEnd !== null) list.push(new LatestEndConstraint(p.latestEnd))
  if (p.avoidDays.size > 0) list.push(new AvoidDaysConstraint(p.avoidDays))
  return list
}

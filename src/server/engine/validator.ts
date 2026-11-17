import type { Schedule } from '../domain/model'
import type { ScheduleConstraint } from './constraints'

/** Checks one section per course, no meeting conflicts, and every hard constraint. */
export class ScheduleValidator {
  readonly constraints: readonly ScheduleConstraint[]

  constructor(constraints: readonly ScheduleConstraint[]) {
    this.constraints = [...constraints]
  }

  /** True if the (possibly partial) schedule breaks no hard constraint. */
  satisfiesConstraints(schedule: Schedule): boolean {
    return this.constraints.every((c) => c.isSatisfiedBy(schedule))
  }

  /** Human-readable violations; empty means valid. */
  violations(schedule: Schedule, requiredCourseCodes: ReadonlySet<string>): string[] {
    const problems: string[] = []
    const seen = new Set<string>()
    for (const s of schedule.sections) {
      if (seen.has(s.courseCode)) problems.push(`More than one section of ${s.courseCode}`)
      seen.add(s.courseCode)
    }
    for (const required of requiredCourseCodes) {
      if (!seen.has(required)) problems.push(`Missing a section of ${required}`)
    }
    if (schedule.hasConflict()) problems.push('Schedule has overlapping meetings')
    for (const c of this.constraints) {
      if (!c.isSatisfiedBy(schedule)) problems.push(`Violates: ${c.description()}`)
    }
    return problems
  }

  isValid(schedule: Schedule, requiredCourseCodes: ReadonlySet<string>): boolean {
    return this.violations(schedule, requiredCourseCodes).length === 0
  }
}

import { NoValidScheduleError } from '../errors'
import { Schedule, type Course, type Section } from '../domain/model'
import type { ScheduleValidator } from './validator'

/** Backtracking with early pruning: conflicting or constraint-violating branches are cut immediately. */
export function generateSchedules(courses: readonly Course[], validator: ScheduleValidator, limit: number): Schedule[] {
  // Fewest sections first: the most constrained course prunes the search soonest. Stable, like the original.
  const ordered = [...courses].sort((a, b) => a.sections.length - b.sections.length)

  const empty = ordered.filter((c) => c.sections.length === 0).map((c) => `${c.code} has no sections offered this term`)
  if (empty.length > 0) throw new NoValidScheduleError('Some selected courses have no sections.', empty)

  const results: Schedule[] = []
  const chosen: Section[] = []
  const required = new Set(ordered.map((c) => c.code))

  const search = (index: number): void => {
    if (results.length >= limit) return
    if (index === ordered.length) {
      const full = Schedule.of(chosen)
      if (validator.isValid(full, required)) results.push(full)
      return
    }
    for (const section of ordered[index].sections) {
      if (chosen.some((s) => s.conflictsWith(section))) continue
      chosen.push(section)
      if (validator.satisfiesConstraints(Schedule.of(chosen))) search(index + 1)
      chosen.pop()
      if (results.length >= limit) return
    }
  }
  search(0)

  if (results.length === 0) {
    throw new NoValidScheduleError('No conflict-free schedule exists for the selected courses.', explain(ordered, validator))
  }
  return results
}

/** Pinpoints course pairs where every section pairing conflicts; falls back to a hint about preferences. */
function explain(courses: readonly Course[], validator: ScheduleValidator): string[] {
  const details: string[] = []
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i]
      const b = courses[j]
      if (a.sections.every((sa) => b.sections.every((sb) => sa.conflictsWith(sb)))) {
        details.push(`Every section of ${a.code} conflicts with every section of ${b.code}`)
      }
    }
  }
  if (details.length === 0) {
    details.push(
      validator.constraints.length === 0
        ? 'The sections cannot be combined without overlapping; try different courses.'
        : 'Your preferences rule out every combination; try relaxing them.',
    )
  }
  return details
}

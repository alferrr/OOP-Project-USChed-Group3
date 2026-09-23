import type { CourseSummary } from '../api/types'

/**
 * The family a specific offering's code belongs to, e.g. "GE-FEL AIS" -> "GE-FEL", "GE-FEL DP101" -> "GE-FEL",
 * "GE-FEL SBE 01" -> "GE-FEL", "GE-FEL1" -> "GE-FEL". A real, ordinary ISMIS course code is "DEPT NUMBER"
 * (e.g. "CIS 2105"): a plain department, then a space, then a number. A family's own root always has a dash
 * (e.g. "GE-FEL"), unlike any real department code - so what actually distinguishes a family member is just
 * that its code STARTS with a dashed root, whatever the specific offering's own suffix looks like (it varies
 * wildly: letters, digits, extra dashes, even further spaces - "GE-FEL MH-TBCY", "GE-FEL SBE 01", ...).
 */
export function familyOf(code: string): string | null {
  const trimmed = code.trim()
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) {
    // No space at all: only a root glued directly to a short digit slot counts ("GE-FEL1").
    const glued = /^([A-Za-z]+-[A-Za-z]+)\d{1,2}$/.exec(trimmed)
    return glued ? glued[1].toUpperCase() : null
  }
  const root = trimmed.slice(0, spaceIdx)
  const rest = trimmed.slice(spaceIdx + 1).trim()
  return /^[A-Za-z]+-[A-Za-z]+$/.test(root) && rest.length > 0 ? root.toUpperCase() : null
}

export interface CourseGroup {
  family: string
  courses: CourseSummary[]
}
/** A standalone course keeps its own row; courses that share a family (2+) collapse under one entry. */
export type CourseRow = { kind: 'course'; course: CourseSummary } | { kind: 'group'; group: CourseGroup }

/** Groups courses that share a family (e.g. every GE-FEL slot) into one row, in first-seen order. */
export function groupCourses(courses: CourseSummary[]): CourseRow[] {
  const families = new Map<string, CourseSummary[]>()
  for (const c of courses) {
    const family = familyOf(c.code)
    if (family) families.set(family, [...(families.get(family) ?? []), c])
  }

  const rows: CourseRow[] = []
  const emitted = new Set<string>()
  for (const c of courses) {
    const family = familyOf(c.code)
    const members = family ? families.get(family)! : null
    if (family && members && members.length > 1) {
      if (!emitted.has(family)) {
        rows.push({ kind: 'group', group: { family, courses: members } })
        emitted.add(family)
      }
    } else {
      rows.push({ kind: 'course', course: c })
    }
  }
  return rows
}

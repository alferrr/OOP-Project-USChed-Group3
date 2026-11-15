import type { ProspectusCourse, SemesterCode } from '../api/types'

/** "cis  1204" and "CIS 1204" are the same course. */
export const normCode = (code: string) => code.trim().replace(/\s+/g, ' ').toUpperCase()

export interface Requisites {
  /** Course codes that must be passed first, normalised. */
  prerequisites: string[]
  /** "3RD YEAR STANDING" -> 3; null when the course has no standing requirement. */
  standingYear: number | null
}

/**
 * Reads ISMIS's free-text requisite column (e.g. "PREREQUISITE CIS 1101 PREREQUISITE CIS 1104" or
 * "3RD YEAR STANDING") into codes and a year standing.
 */
export function parseRequisites(note: string): Requisites {
  const standing = /(\d)\s*(?:ST|ND|RD|TH)\s+YEAR\s+STANDING/i.exec(note)
  const prerequisites = note
    .replace(/(\d)\s*(?:ST|ND|RD|TH)\s+YEAR\s+STANDING/gi, ' ')
    .split(/PREREQUISITE/i)
    .slice(1)
    .flatMap((part) => part.split(/[,;]/))
    .map(normCode)
    .filter(Boolean)
  return { prerequisites: [...new Set(prerequisites)], standingYear: standing ? Number(standing[1]) : null }
}

const TERM_ORDER: SemesterCode[] = ['1ST', '2ND', 'SUMMER']
const termRank = (c: { yearLevel: number; semester: SemesterCode }) => c.yearLevel * 10 + TERM_ORDER.indexOf(c.semester)

/** Codes of every prospectus course that comes before the given year level and term. */
export function codesBefore(courses: ProspectusCourse[], yearLevel: number, semester: SemesterCode): string[] {
  const cutoff = termRank({ yearLevel, semester })
  return courses.filter((c) => termRank(c) < cutoff).map((c) => normCode(c.code))
}

export interface PrerequisiteCheck {
  /** Prerequisites the student has not marked as passed. */
  missing: string[]
  standingYear: number | null
}

/**
 * What stands between the student and a course, judged against the courses they marked as passed. Null when
 * the course is not in their prospectus (e.g. an elective ISMIS offers under a family code): nothing is known.
 */
export function checkPrerequisites(
  code: string,
  courses: ProspectusCourse[],
  passed: readonly string[],
): PrerequisiteCheck | null {
  const key = normCode(code)
  const course = courses.find((c) => normCode(c.code) === key)
  if (!course) return null
  const { prerequisites, standingYear } = parseRequisites(course.requisiteNote)
  const done = new Set(passed)
  return { missing: prerequisites.filter((p) => !done.has(p)), standingYear }
}

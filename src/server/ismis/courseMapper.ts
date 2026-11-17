import {
  Course,
  Section,
  instructor,
  meeting,
  room,
  type Day,
  type Instructor,
  type Meeting,
  type Semester,
} from '../domain/model'
import { hm, timeRange } from '../domain/time'
import { InvalidCourseDataError, USChedError } from '../errors'
import type { IsmisRawCourse } from './parser'

const CODE_GROUP = /^(.+?)\s+-\s+(.+)$/
const ENROLLED = /^(\d+)\s*\/\s*(\d+)$/
const SEGMENT =
  /^\s*([MTWFS][A-Za-z]*)\s+(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?(?:\s+(\S.*?))?\s*$/

export interface MapResult {
  courses: Course[]
  skipped: string[]
}

interface SectionAcc {
  meetings: Meeting[]
  instructor: Instructor | null
  slots: number | null
}

interface CourseAcc {
  title: string
  sections: Map<string, SectionAcc>
}

/**
 * Anti-corruption layer: raw rows in, validated domain objects out. Bad rows are skipped and reported.
 * Handles the real formats: "CIS 2105 - Group 1", "MW 03:00 PM - 05:30 PM LB470TC", "24/24".
 */
export function mapIsmisRows(
  rows: readonly IsmisRawCourse[],
  semester: Semester,
  academicYear: string,
  campus: string,
  defaultUnits: number,
): MapResult {
  const byCode = new Map<string, CourseAcc>()
  const skipped: string[] = []
  for (const raw of rows) {
    try {
      readRow(raw, campus, byCode)
    } catch (e) {
      if (!(e instanceof USChedError)) throw e
      const label = !raw.courseCode || !raw.courseCode.trim() ? 'row' : raw.courseCode.trim()
      skipped.push(`${label} (row ${raw.row}): ${e.message}`)
    }
  }

  const courses: Course[] = []
  for (const [code, c] of byCode) {
    const sections: Section[] = []
    for (const [sectionCode, s] of c.sections) {
      try {
        sections.push(
          new Section({
            id: null,
            courseCode: code,
            courseName: c.title,
            units: defaultUnits,
            sectionCode,
            instructor: s.instructor,
            semester,
            academicYear,
            availableSlots: s.slots,
            meetings: s.meetings,
          }),
        )
      } catch (e) {
        if (!(e instanceof USChedError)) throw e
        skipped.push(`${code}-${sectionCode}: ${e.message}`)
      }
    }
    try {
      courses.push(new Course({ id: null, code, name: c.title, units: defaultUnits, sections }))
    } catch (e) {
      if (!(e instanceof USChedError)) throw e
      skipped.push(`${code}: ${e.message}`)
    }
  }
  return { courses, skipped }
}

function readRow(raw: IsmisRawCourse, campus: string, byCode: Map<string, CourseAcc>) {
  const cg = CODE_GROUP.exec(need(raw.courseCode, 'course code'))
  if (!cg) throw new InvalidCourseDataError(`expected "CODE - Group" but got "${raw.courseCode}"`)
  const code = cg[1].trim()
  const section = cg[2].trim()
  const title = need(raw.title, 'description')
  const lab = /\blab(oratory)?\b/.test(title.toLowerCase())

  const meetings: Meeting[] = []
  for (const line of raw.scheduleLines ?? []) meetings.push(...parseSegment(line, campus, lab))
  if (meetings.length === 0) throw new InvalidCourseDataError('no usable schedule')

  let c = byCode.get(code)
  if (!c) byCode.set(code, (c = { title, sections: new Map() }))
  c.title = title
  let s = c.sections.get(section)
  if (!s) c.sections.set(section, (s = { meetings: [], instructor: null, slots: null }))
  s.meetings.push(...meetings)
  const teachers = raw.teachers ?? []
  if (teachers.length > 0) s.instructor = instructor(null, teachers.join(' / ').slice(0, 150))
  if (raw.enrolled) {
    const e = ENROLLED.exec(raw.enrolled.trim())
    if (e) s.slots = Math.max(0, Number(e[2]) - Number(e[1]))
  }
}

export function parseSegment(segment: string, campus: string, lab: boolean): Meeting[] {
  const m = SEGMENT.exec(segment)
  if (!m) throw new InvalidCourseDataError(`unrecognised schedule: ${segment.trim()}`)
  const days = parseDays(m[1])
  const endSuffix = m[7] ?? null
  const end = clock(m[5], m[6], endSuffix)
  let start = clock(m[2], m[3], m[4] ?? endSuffix)
  // "10:30 - 12:00 PM" style: no suffix on the start, and reading it as PM would put it after the end.
  if (m[4] === undefined && !(start < end) && start >= 12 * 60) start -= 12 * 60
  const range = timeRange(start, end)
  const roomText = m[8]
  const r =
    roomText === undefined || roomText.toUpperCase() === 'TBA'
      ? null
      : room(null, roomText.trim(), campusOf(roomText.trim(), campus))
  return days.map((d) => meeting(lab ? 'LAB' : 'LECTURE', d, range, r))
}

/**
 * USC's two campuses show up as a suffix baked right into the room code (e.g. "LB470TC" -> Talamban,
 * "LB201MC" -> Main), not as a separate field ISMIS reports - so the campus configured as a "default"
 * is really only a fallback for the rare room code that has neither suffix.
 */
export function campusOf(roomCode: string, fallback: string): string {
  const upper = roomCode.toUpperCase()
  if (upper.endsWith('TC')) return 'Talamban'
  if (upper.endsWith('MC')) return 'Main'
  return fallback
}

export function parseDays(token: string): Day[] {
  const days: Day[] = []
  let t = token
  while (t.length > 0) {
    const lower = t.toLowerCase()
    if (lower.startsWith('th')) {
      days.push('THU')
      t = t.slice(2)
    } else if (lower.startsWith('sat')) {
      days.push('SAT')
      t = t.slice(3)
    } else {
      switch (t[0].toUpperCase()) {
        case 'M':
          days.push('MON')
          break
        case 'T':
          days.push('TUE')
          break
        case 'W':
          days.push('WED')
          break
        case 'F':
          days.push('FRI')
          break
        case 'S':
          days.push('SAT')
          break
        default:
          throw new InvalidCourseDataError(`unknown day token: ${token}`)
      }
      t = t.slice(1)
    }
  }
  return days
}

function clock(hour: string, minute: string | undefined, suffix: string | null): number {
  let h = Number(hour)
  const min = minute === undefined ? 0 : Number(minute)
  if (suffix) h = (h % 12) + (suffix.toLowerCase() === 'pm' ? 12 : 0)
  return hm(h, min) // throws InvalidCourseDataError for e.g. 25:00, so the row is skipped, not fatal
}

function need(v: string | null | undefined, what: string): string {
  if (!v || !v.trim()) throw new InvalidCourseDataError(`missing ${what}`)
  return v
}

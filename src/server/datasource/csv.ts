import Papa from 'papaparse'
import {
  Course,
  Section,
  dayFromCode,
  instructor,
  meeting,
  room,
  semesterFromCode,
  type Day,
  type Instructor as InstructorT,
  type Meeting,
  type Semester,
} from '../domain/model'
import { rangeOf } from '../domain/time'
import { DataSourceError, InvalidCourseDataError, USChedError } from '../errors'
import type { FetchedCourses } from './types'

interface SectionAcc {
  instructor: InstructorT | null
  slots: number | null
  meetings: Meeting[]
  code: string
  semester: Semester
  year: string
}

interface CourseAcc {
  name: string
  units: number
  department: string | null
  prerequisites: string | null
  sections: Map<string, SectionAcc>
}

type Row = Record<string, string | undefined>

/**
 * One CSV row per meeting. Invalid rows are skipped and reported, never fatal. Rows outside the wanted
 * semester / academic year (when given) are ignored.
 */
export function readCsvCourses(csv: string, wantedSemester: Semester | null, wantedYear: string | null): FetchedCourses {
  const parsed = Papa.parse<Row>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  if (parsed.meta.fields === undefined || parsed.meta.fields.length === 0) {
    throw new DataSourceError('Could not read CSV: no header row found')
  }

  const skipped: string[] = []
  const byCourse = new Map<string, CourseAcc>()
  parsed.data.forEach((row, i) => {
    try {
      readRow(row, wantedSemester, wantedYear, byCourse)
    } catch (e) {
      if (!(e instanceof USChedError)) throw e
      skipped.push(`line ${i + 1}: ${e.message}`)
    }
  })
  return { type: 'CSV', courses: build(byCourse, skipped), skipped, providesUnits: true }
}

function readRow(r: Row, wantedSem: Semester | null, wantedYear: string | null, byCourse: Map<string, CourseAcc>) {
  const sem = semesterFromCode(require(r, 'semester'))
  const year = require(r, 'academic_year')
  if ((wantedSem && sem !== wantedSem) || (wantedYear && wantedYear !== year)) return

  const code = require(r, 'course_code')
  const sectionCode = require(r, 'section_code')
  const units = Number(require(r, 'units'))
  if (!Number.isFinite(units)) throw new InvalidCourseDataError(`units is not a number for ${code}`)
  if (units <= 0) throw new InvalidCourseDataError(`units must be positive for ${code}`)
  const day: Day = dayFromCode(require(r, 'day'))
  const time = rangeOf(require(r, 'start_time'), require(r, 'end_time'))
  const roomCode = opt(r, 'room')
  const campus = opt(r, 'campus')
  const theRoom = roomCode === null ? null : room(null, roomCode, campus ?? 'Main')
  const type = opt(r, 'meeting_type')?.toUpperCase() === 'LAB' ? 'LAB' : 'LECTURE'
  const m = meeting(type, day, time, theRoom)

  let c = byCourse.get(code)
  if (!c) byCourse.set(code, (c = { name: '', units, department: null, prerequisites: null, sections: new Map() }))
  c.name = require(r, 'course_name')
  c.units = units
  c.department = opt(r, 'department')
  c.prerequisites = opt(r, 'prerequisites')

  const key = `${sectionCode}\u0000${sem}\u0000${year}`
  let s = c.sections.get(key)
  if (!s) c.sections.set(key, (s = { instructor: null, slots: null, meetings: [], code: sectionCode, semester: sem, year }))
  const name = opt(r, 'instructor')
  s.instructor = name === null ? null : instructor(null, name)
  const slots = opt(r, 'available_slots')
  if (slots === null) s.slots = null
  else {
    const n = Number(slots)
    if (!Number.isInteger(n)) throw new InvalidCourseDataError(`available_slots is not a whole number for ${code}`)
    s.slots = n
  }
  s.meetings.push(m)
}

function build(byCourse: Map<string, CourseAcc>, skipped: string[]): Course[] {
  const courses: Course[] = []
  for (const [code, c] of byCourse) {
    const sections: Section[] = []
    for (const s of c.sections.values()) {
      try {
        sections.push(
          new Section({
            id: null,
            courseCode: code,
            courseName: c.name,
            units: c.units,
            sectionCode: s.code,
            instructor: s.instructor,
            semester: s.semester,
            academicYear: s.year,
            availableSlots: s.slots,
            meetings: s.meetings,
          }),
        )
      } catch (e) {
        if (!(e instanceof USChedError)) throw e
        skipped.push(`${code}-${s.code}: ${e.message}`)
      }
    }
    try {
      courses.push(
        new Course({
          id: null,
          code,
          name: c.name,
          units: c.units,
          department: c.department,
          prerequisites: c.prerequisites,
          sections,
        }),
      )
    } catch (e) {
      if (!(e instanceof USChedError)) throw e
      skipped.push(`${code}: ${e.message}`)
    }
  }
  return courses
}

function require(r: Row, col: string): string {
  const v = opt(r, col)
  if (v === null) throw new InvalidCourseDataError(`missing ${col}`)
  return v
}

function opt(r: Row, col: string): string | null {
  const v = r[col]
  return v === undefined || v === null || v.trim() === '' ? null : v.trim()
}

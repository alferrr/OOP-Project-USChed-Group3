import { Course, Section, instructor as makeInstructor, meeting, room, type Day, type Instructor, type Meeting } from '@/server/domain/model'
import { rangeOf } from '@/server/domain/time'

export const lecture = (day: Day, start: string, end: string): Meeting => meeting('LECTURE', day, rangeOf(start, end), null)
export const lab = (day: Day, start: string, end: string): Meeting => meeting('LAB', day, rangeOf(start, end), null)

/** A meeting held in a room on the given campus, for anything testing campus-aware scoring. */
export const lectureOn = (campus: string, day: Day, start: string, end: string): Meeting =>
  meeting('LECTURE', day, rangeOf(start, end), room(null, 'R1', campus))

export function section(course: string, code: string, ...meetings: Meeting[]): Section
export function section(course: string, code: string, instructor: Instructor | null, ...meetings: Meeting[]): Section
export function section(course: string, code: string, ...rest: (Meeting | Instructor | null)[]): Section {
  const first = rest[0]
  const hasInstructor = first === null || (first !== undefined && 'name' in first)
  const ins = hasInstructor ? (first as Instructor | null) : null
  const meetings = (hasInstructor ? rest.slice(1) : rest) as Meeting[]
  return new Section({
    id: null,
    courseCode: course,
    courseName: `${course} name`,
    units: 3,
    sectionCode: code,
    instructor: ins,
    semester: '1ST',
    academicYear: '2026-2027',
    availableSlots: 40,
    meetings,
  })
}

/** For tests that need real section ids (e.g. anything comparing schedules by section identity). */
export const sectionWithId = (id: number, course: string, code: string, ...meetings: Meeting[]): Section =>
  new Section({
    id,
    courseCode: course,
    courseName: `${course} name`,
    units: 3,
    sectionCode: code,
    instructor: null,
    semester: '1ST',
    academicYear: '2026-2027',
    availableSlots: 40,
    meetings,
  })

export const course = (code: string, ...sections: Section[]): Course =>
  new Course({ id: null, code, name: `${code} name`, units: 3, sections })

/** A course with n sections, each on a distinct hour slot on Monday. */
export function courseWithSlots(code: string, n: number, firstHour: number): Course {
  const sections: Section[] = []
  for (let i = 0; i < n; i++) {
    const h = String(firstHour + i).padStart(2, '0')
    sections.push(section(code, String.fromCharCode(65 + i), lecture('MON', `${h}:00`, `${h}:30`)))
  }
  return new Course({ id: null, code, name: `${code} name`, units: 3, sections })
}

export { makeInstructor }

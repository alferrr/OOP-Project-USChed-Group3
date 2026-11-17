import type { Course as CourseRow, Instructor as InstructorRow, Meeting as MeetingRow, Room as RoomRow, Section as SectionRow } from '@prisma/client'
import {
  Course,
  Section,
  dayFromCode,
  DAYS,
  instructor,
  meeting,
  room,
  semesterFromCode,
  type MeetingType,
} from '../domain/model'
import { timeRange } from '../domain/time'

export type SectionWithAll = SectionRow & {
  course: CourseRow
  instructor: InstructorRow | null
  meetings: (MeetingRow & { room: RoomRow | null })[]
}

/** Row to domain mapping. Domain objects re-validate everything they are given. */
export function sectionToDomain(e: SectionWithAll): Section {
  const meetings = [...e.meetings]
    .sort((a, b) => DAYS.indexOf(dayFromCode(a.dayOfWeek)) - DAYS.indexOf(dayFromCode(b.dayOfWeek)) || a.startMinute - b.startMinute)
    .map((m) =>
      meeting(
        (m.meetingType === 'LAB' ? 'LAB' : 'LECTURE') as MeetingType,
        dayFromCode(m.dayOfWeek),
        timeRange(m.startMinute, m.endMinute),
        m.room ? room(m.room.building === '' ? null : m.room.building, m.room.roomCode, m.room.campus) : null,
      ),
    )
  return new Section({
    id: e.id,
    courseCode: e.course.code,
    courseName: e.course.name,
    units: Number(e.course.units),
    sectionCode: e.sectionCode,
    instructor: e.instructor ? instructor(e.instructor.id, e.instructor.name) : null,
    semester: semesterFromCode(e.semester),
    academicYear: e.academicYear,
    availableSlots: e.availableSlots,
    meetings,
  })
}

export function courseToDomain(c: CourseRow, sections: readonly Section[]): Course {
  return new Course({
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    units: Number(c.units),
    department: c.department,
    prerequisites: c.prerequisites,
    sections,
  })
}

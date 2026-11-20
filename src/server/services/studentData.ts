import { prisma } from '../db'
import { ismisSessions } from './ismisSessions'

export interface DeletionReport {
  courses: number
  sections: number
  searches: number
  savedSchedules: number
  tourRecords: number
  endedSessions: number
}

/**
 * Removes everything USChed holds about one student ID number, and signs them out. Instructors and rooms are
 * shared reference data, not theirs, so they stay. Consent records hold no ID, so there is nothing to remove there.
 */
export async function deleteStudentData(studentIdNumber: string): Promise<DeletionReport> {
  const endedSessions = ismisSessions().endForStudent(studentIdNumber)
  const [savedSchedules, searches, tourRecords, sections, courses] = await prisma.$transaction([
    prisma.savedSchedule.deleteMany({ where: { studentIdNumber } }),
    prisma.catalogSnapshot.deleteMany({ where: { studentIdNumber } }),
    prisma.tourCompletion.deleteMany({ where: { studentIdNumber } }),
    prisma.section.deleteMany({ where: { studentIdNumber } }),
    prisma.course.deleteMany({ where: { studentIdNumber } }),
  ])
  return { courses: courses.count, sections: sections.count, searches: searches.count, savedSchedules: savedSchedules.count, tourRecords: tourRecords.count, endedSessions }
}

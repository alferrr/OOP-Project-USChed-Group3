import type { Prisma } from '@prisma/client'
import type { FetchedCourses } from '../datasource/types'
import { getOrCreate, prisma } from '../db'
import type { Course, Meeting, Section } from '../domain/model'

export interface ImportReport {
  courses: number
  sections: number
  skipped: number
  errors: string[]
}

type Tx = Prisma.TransactionClient

/** Depends only on FetchedCourses: it cannot tell ISMIS from a CSV or a mock. Upserts by natural keys. */
export async function importCourses(
  source: FetchedCourses,
  semester: string,
  academicYear: string,
  studentIdNumber: string,
): Promise<ImportReport> {
  const errors = [...source.skipped]
  let courseCount = 0
  let sectionCount = 0
  await prisma.$transaction(
    async (tx) => {
      for (const c of source.courses) {
        const courseId = await upsertCourse(tx, c, source.providesUnits, studentIdNumber)
        courseCount++
        for (const s of c.sections) {
          await upsertSection(tx, courseId, s, studentIdNumber)
          sectionCount++
        }
      }
      await tx.catalogSnapshot.create({
        data: {
          studentIdNumber,
          source: source.type,
          semester,
          academicYear,
          courseCount,
          sectionCount,
          skippedCount: errors.length,
          scrapedAt: new Date(),
        },
      })
    },
    { maxWait: 10_000, timeout: 120_000 },
  )
  return { courses: courseCount, sections: sectionCount, skipped: errors.length, errors }
}

async function upsertCourse(tx: Tx, c: Course, sourceHasUnits: boolean, studentIdNumber: string): Promise<number> {
  const existing = await tx.course.findUnique({ where: { studentIdNumber_code: { studentIdNumber, code: c.code } } })
  const data = {
    name: c.name,
    // ISMIS has no units column: keep the units already known (e.g. from the prospectus) instead of the default.
    ...(sourceHasUnits || !existing ? { units: c.units } : {}),
    ...(c.department !== null ? { department: c.department } : {}),
    ...(c.prerequisites !== null ? { prerequisites: c.prerequisites } : {}),
    ...(c.description !== null ? { description: c.description } : {}),
  }
  if (existing) {
    await tx.course.update({ where: { id: existing.id }, data })
    return existing.id
  }
  const created = await tx.course.create({ data: { studentIdNumber, code: c.code, units: c.units, ...data } })
  return created.id
}

async function upsertSection(tx: Tx, courseId: number, s: Section, studentIdNumber: string): Promise<void> {
  const instructorRowId = s.instructor ? await instructorId(s.instructor.name) : null
  const data = {
    studentIdNumber,
    instructorId: instructorRowId,
    availableSlots: s.availableSlots,
  }
  const where = {
    courseId_sectionCode_semester_academicYear: {
      courseId,
      sectionCode: s.sectionCode,
      semester: s.semester,
      academicYear: s.academicYear,
    },
  }
  const existing = await tx.section.findUnique({ where })
  const sectionId = existing
    ? (await tx.section.update({ where: { id: existing.id }, data })).id
    : (await tx.section.create({ data: { ...data, courseId, sectionCode: s.sectionCode, semester: s.semester, academicYear: s.academicYear } })).id

  // A re-import replaces the section's meetings wholesale.
  await tx.meeting.deleteMany({ where: { sectionId } })
  for (const m of s.meetings) {
    await tx.meeting.create({
      data: {
        sectionId,
        roomId: m.room ? await roomId(m) : null,
        meetingType: m.type,
        dayOfWeek: m.day,
        startMinute: m.time.start,
        endMinute: m.time.end,
      },
    })
  }
}

// Instructors and rooms are shared reference rows, so they are resolved outside the import transaction: a row
// another student's import just committed must be visible to the retry in getOrCreate, which a transaction's
// REPEATABLE READ snapshot would hide.
async function instructorId(name: string): Promise<number> {
  const row = await getOrCreate(
    () => prisma.instructor.findUnique({ where: { name } }),
    () => prisma.instructor.create({ data: { name } }),
  )
  return row.id
}

async function roomId(m: Meeting): Promise<number> {
  const r = m.room!
  const building = r.building ?? ''
  const campus = r.campus ?? 'Main'
  const key = { campus_building_roomCode: { campus, building, roomCode: r.roomCode } }
  const row = await getOrCreate(
    () => prisma.room.findUnique({ where: key }),
    () => prisma.room.create({ data: { building, roomCode: r.roomCode, campus } }),
  )
  return row.id
}

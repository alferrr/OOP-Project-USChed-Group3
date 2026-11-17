import { prisma } from '../db'
import type { Course, Section, Semester } from '../domain/model'
import { InvalidCourseDataError, ResourceNotFoundError, USChedError } from '../errors'
import { courseToDomain, sectionToDomain, type SectionWithAll } from './mapper'

export interface PageResult<T> {
  items: T[]
  page: number
  size: number
  total: number
}

const SECTION_INCLUDE = { course: true, instructor: true, meetings: { include: { room: true } } } as const

/** Every function is scoped to one student's own catalog by their ISMIS ID number; nothing here is shared. */

export async function searchCourses(
  studentIdNumber: string,
  q: string | null,
  department: string | null,
  semester: Semester,
  academicYear: string,
  page: number,
  size: number,
): Promise<PageResult<Course>> {
  if (!Number.isInteger(page) || !Number.isInteger(size) || page < 0 || size < 1 || size > 100) {
    throw new InvalidCourseDataError('page must be >= 0 and size between 1 and 100')
  }
  const text = (q ?? '').trim()
  const dept = (department ?? '').trim()
  // MySQL's default collation is case-insensitive, so `contains` matches regardless of case.
  const where = {
    studentIdNumber,
    ...(text ? { OR: [{ code: { contains: text } }, { name: { contains: text } }] } : {}),
    ...(dept ? { department: dept } : {}),
    sections: { some: { semester, academicYear } },
  }
  const [rows, total] = await Promise.all([
    prisma.course.findMany({ where, orderBy: { code: 'asc' }, skip: page * size, take: size }),
    prisma.course.count({ where }),
  ])
  return { items: rows.map((c) => courseToDomain(c, [])), page, size, total }
}

export async function getCourse(studentIdNumber: string, id: number): Promise<Course> {
  const c = await prisma.course.findFirst({ where: { id, studentIdNumber } })
  if (!c) throw new ResourceNotFoundError(`Course ${id} not found`)
  return courseToDomain(c, [])
}

export async function courseSections(
  studentIdNumber: string,
  courseId: number,
  semester: Semester,
  academicYear: string,
): Promise<Section[]> {
  if (!(await prisma.course.findFirst({ where: { id: courseId, studentIdNumber }, select: { id: true } }))) {
    throw new ResourceNotFoundError(`Course ${courseId} not found`)
  }
  return sectionsToDomain(await findSectionsForCourses(studentIdNumber, [courseId], semester, academicYear))
}

export async function departments(studentIdNumber: string): Promise<string[]> {
  const rows = await prisma.course.findMany({
    where: { studentIdNumber, department: { not: null } },
    select: { department: true },
    distinct: ['department'],
    orderBy: { department: 'asc' },
  })
  return rows.map((r) => r.department as string)
}

export async function academicYears(studentIdNumber: string): Promise<string[]> {
  const rows = await prisma.section.findMany({
    where: { studentIdNumber },
    select: { academicYear: true },
    distinct: ['academicYear'],
    orderBy: { academicYear: 'desc' },
  })
  return rows.map((r) => r.academicYear)
}

/** Empties this student's own private catalog (everything fetched from ISMIS so far). Nobody else's is touched. */
export async function clearCatalog(studentIdNumber: string): Promise<void> {
  await prisma.$transaction([
    prisma.section.deleteMany({ where: { studentIdNumber } }), // their meetings cascade with them
    prisma.course.deleteMany({ where: { studentIdNumber } }),
  ])
}

export function findSectionsForCourses(
  studentIdNumber: string,
  courseIds: number[],
  semester: Semester,
  academicYear: string,
): Promise<SectionWithAll[]> {
  return prisma.section.findMany({
    where: { studentIdNumber, courseId: { in: courseIds }, semester, academicYear },
    include: SECTION_INCLUDE,
    orderBy: { sectionCode: 'asc' },
  })
}

export function findSectionsByIds(studentIdNumber: string, ids: number[]): Promise<SectionWithAll[]> {
  return prisma.section.findMany({ where: { studentIdNumber, id: { in: ids } }, include: SECTION_INCLUDE })
}

/** A stored section that no longer validates is unusable for planning; leave it out rather than fail. */
export function sectionsToDomain(rows: readonly SectionWithAll[]): Section[] {
  const out: Section[] = []
  for (const row of rows) {
    try {
      out.push(sectionToDomain(row))
    } catch (e) {
      if (!(e instanceof USChedError)) throw e
    }
  }
  return out
}

import { getConfig } from '../config'
import { prisma } from '../db'
import { Course, Schedule, type RankedSchedule, type Section, type Semester } from '../domain/model'
import { constraintsFrom } from '../engine/constraints'
import { generateSchedules } from '../engine/generator'
import type { SchedulePreference } from '../engine/preference'
import { defaultScorer } from '../engine/scoring'
import { ScheduleValidator } from '../engine/validator'
import { InvalidCourseDataError, ResourceNotFoundError } from '../errors'
import { courseToDomain, sectionToDomain } from './mapper'
import { findSectionsByIds, findSectionsForCourses } from './courses'

export interface GenerationResult {
  totalUnits: number
  generatedCount: number
  ranked: RankedSchedule[]
}

const scorer = defaultScorer()

/** Every function is scoped to one student's own catalog by their student ID number. */
export async function generateForStudent(
  studentIdNumber: string,
  courseIds: number[],
  semester: Semester,
  academicYear: string,
  limit: number | null | undefined,
  prefs: SchedulePreference,
  likeSectionIds: number[] | null | undefined,
): Promise<GenerationResult> {
  if (!courseIds || courseIds.length === 0) throw new InvalidCourseDataError('Select at least one course.')
  const ids = [...new Set(courseIds)]
  const rows = await prisma.course.findMany({ where: { id: { in: ids }, studentIdNumber } })
  if (rows.length !== ids.length) {
    const found = new Set(rows.map((r) => r.id))
    throw new ResourceNotFoundError(`Unknown course id(s): [${ids.filter((i) => !found.has(i)).join(', ')}]`)
  }

  const byCourse = new Map<number, Section[]>()
  for (const s of await findSectionsForCourses(studentIdNumber, ids, semester, academicYear)) {
    try {
      const list = byCourse.get(s.courseId) ?? []
      list.push(sectionToDomain(s))
      byCourse.set(s.courseId, list)
    } catch {
      // Sections without usable meeting data cannot be planned.
    }
  }

  // Keep the order the database returned the courses in, like the original lookup did.
  const domain: Course[] = []
  let totalUnits = 0
  for (const row of rows) {
    domain.push(courseToDomain(row, byCourse.get(row.id) ?? []))
    totalUnits += Number(row.units)
  }

  const gen = getConfig().generation
  const validator = new ScheduleValidator(constraintsFrom(prefs))
  const generated = generateSchedules(domain, validator, gen.cap)
  const top = limit == null ? gen.defaultLimit : Math.max(1, Math.min(limit, 100))
  const ranked =
    !likeSectionIds || likeSectionIds.length === 0
      ? scorer.rank(generated, prefs, top)
      : scorer.rankBySimilarity(generated, prefs, new Set(likeSectionIds), top)
  return { totalUnits, generatedCount: generated.length, ranked }
}

/** Scores one hand-built schedule (any number of sections the student picked), exactly like a generated one. */
export async function scoreForStudent(studentIdNumber: string, sectionIds: number[], prefs: SchedulePreference): Promise<RankedSchedule> {
  const ids = [...new Set(sectionIds)]
  if (ids.length === 0 || ids.length > 20) throw new InvalidCourseDataError('Pick between 1 and 20 sections.')
  const rows = await findSectionsByIds(studentIdNumber, ids)
  const byId = new Map(rows.map((r) => [r.id, sectionToDomain(r)]))
  const picked = ids.map((id) => {
    const s = byId.get(id)
    if (!s) throw new ResourceNotFoundError(`Unknown section id ${id}`)
    return s
  })
  return scorer.score(Schedule.of(picked), prefs)
}

/** Metrics for 2-4 schedules, each given as a list of section ids. Always computed server-side. */
export async function compareForStudent(
  studentIdNumber: string,
  sectionIdGroups: number[][],
  prefs: SchedulePreference,
): Promise<RankedSchedule[]> {
  if (!sectionIdGroups || sectionIdGroups.length < 2 || sectionIdGroups.length > 4) {
    throw new InvalidCourseDataError('Compare 2 to 4 schedules.')
  }
  const all = [...new Set(sectionIdGroups.flat())]
  const byId = new Map<number, Section>()
  for (const row of await findSectionsByIds(studentIdNumber, all)) byId.set(row.id, sectionToDomain(row))

  return sectionIdGroups.map((group) => {
    const picked = group.map((id) => {
      const s = byId.get(id)
      if (!s) throw new ResourceNotFoundError(`Unknown section id ${id}`)
      return s
    })
    return scorer.score(Schedule.of(picked), prefs)
  })
}

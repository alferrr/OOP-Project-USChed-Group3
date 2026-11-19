import { prisma } from '../db'
import { InvalidCourseDataError } from '../errors'

/** A student can keep this many; enough for real use, small enough that nobody can fill the table. */
export const MAX_SAVED = 50
const MAX_PAYLOAD_CHARS = 200_000

export interface SavedItem {
  id: string
  semester: string
  academicYear: string
  schedule: unknown
}

/** The same key the browser uses: the schedule's section ids, sorted. Saving the same sections twice is one save. */
export const scheduleKey = (sectionIds: number[]): string => [...sectionIds].sort((a, b) => a - b).join(',')

export async function listSaved(studentIdNumber: string): Promise<SavedItem[]> {
  const rows = await prisma.savedSchedule.findMany({ where: { studentIdNumber }, orderBy: { createdAt: 'asc' } })
  return rows.map((r) => ({ id: r.scheduleKey, semester: r.semester, academicYear: r.academicYear, schedule: JSON.parse(r.payload) }))
}

export async function saveSchedule(
  studentIdNumber: string,
  semester: string,
  academicYear: string,
  sectionIds: number[],
  schedule: unknown,
): Promise<void> {
  const payload = JSON.stringify(schedule)
  if (payload.length > MAX_PAYLOAD_CHARS) throw new InvalidCourseDataError('That schedule is too large to save.')
  const key = scheduleKey(sectionIds)
  if (key === '' || key.length > 255) throw new InvalidCourseDataError('That schedule cannot be saved.')
  const exists = await prisma.savedSchedule.findUnique({ where: { studentIdNumber_scheduleKey: { studentIdNumber, scheduleKey: key } } })
  if (!exists && (await prisma.savedSchedule.count({ where: { studentIdNumber } })) >= MAX_SAVED) {
    throw new InvalidCourseDataError(`You can keep up to ${MAX_SAVED} saved schedules. Remove one first.`)
  }
  await prisma.savedSchedule.upsert({
    where: { studentIdNumber_scheduleKey: { studentIdNumber, scheduleKey: key } },
    create: { studentIdNumber, scheduleKey: key, semester, academicYear, payload },
    update: { semester, academicYear, payload },
  })
}

export async function removeSaved(studentIdNumber: string, key: string): Promise<void> {
  await prisma.savedSchedule.deleteMany({ where: { studentIdNumber, scheduleKey: key } })
}

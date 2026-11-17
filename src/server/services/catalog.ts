import { getConfig } from '../config'
import { prisma } from '../db'
import type { Semester } from '../domain/model'

export interface CatalogStatus {
  available: boolean
  source: string | null
  scrapedAt: Date | null
  courseCount: number
  sectionCount: number
  fresh: boolean
}

/** Each student has their own catalog and their own freshness snapshot; nothing here is shared. */
export async function catalogStatus(studentIdNumber: string, semester: Semester, academicYear: string): Promise<CatalogStatus> {
  const snap = await prisma.catalogSnapshot.findFirst({
    where: { studentIdNumber, semester, academicYear },
    orderBy: [{ scrapedAt: 'desc' }, { id: 'desc' }],
  })
  if (!snap) return { available: false, source: null, scrapedAt: null, courseCount: 0, sectionCount: 0, fresh: false }

  const [offered, sectionCount] = await Promise.all([
    prisma.section.findMany({
      where: { studentIdNumber, semester, academicYear },
      select: { courseId: true },
      distinct: ['courseId'],
    }),
    prisma.section.count({ where: { studentIdNumber, semester, academicYear } }),
  ])
  const hours = (Date.now() - snap.scrapedAt.getTime()) / 3_600_000
  return {
    available: true,
    source: snap.source,
    scrapedAt: snap.scrapedAt,
    courseCount: offered.length,
    sectionCount,
    fresh: Math.floor(hours) < getConfig().catalog.ttlHours,
  }
}

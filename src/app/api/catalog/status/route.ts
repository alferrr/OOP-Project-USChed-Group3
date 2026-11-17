import { query, route } from '@/server/http/api'
import { semesterFromCode } from '@/server/domain/model'
import { catalogStatus } from '@/server/services/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const s = await catalogStatus(
    studentIdNumber,
    semesterFromCode(query.required(req, 'semester')),
    query.required(req, 'academicYear'),
  )
  return {
    available: s.available,
    source: s.source,
    scrapedAt: s.scrapedAt ? s.scrapedAt.toISOString() : null,
    courseCount: s.courseCount,
    sectionCount: s.sectionCount,
    fresh: s.fresh,
  }
})

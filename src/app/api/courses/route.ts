import { noContent, query, route } from '@/server/http/api'
import { semesterFromCode } from '@/server/domain/model'
import { clearCatalog, searchCourses } from '@/server/services/courses'
import { courseSummary } from '@/server/http/summaries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const result = await searchCourses(
    studentIdNumber,
    query.optional(req, 'q'),
    query.optional(req, 'department'),
    semesterFromCode(query.required(req, 'semester')),
    query.required(req, 'academicYear'),
    query.int(req, 'page', 0),
    query.int(req, 'size', 20),
  )
  return { items: result.items.map(courseSummary), page: result.page, size: result.size, total: result.total }
})

/** Empties the signed-in student's own private catalog (every course/section fetched from ISMIS so far). */
export const DELETE = route({ guard: 'student' }, async ({ studentIdNumber }) => {
  await clearCatalog(studentIdNumber)
  return noContent()
})

import { query, route, toInt } from '@/server/http/api'
import { semesterFromCode } from '@/server/domain/model'
import { sectionDto } from '@/server/http/dto'
import { courseSections } from '@/server/services/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'student' }, async ({ req, params, studentIdNumber }) => {
  const sections = await courseSections(
    studentIdNumber,
    toInt(params.id),
    semesterFromCode(query.required(req, 'semester')),
    query.required(req, 'academicYear'),
  )
  return sections.map(sectionDto)
})

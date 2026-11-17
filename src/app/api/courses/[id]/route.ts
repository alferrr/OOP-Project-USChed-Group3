import { route, toInt } from '@/server/http/api'
import { courseSummary } from '@/server/http/summaries'
import { getCourse } from '@/server/services/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'student' }, async ({ params, studentIdNumber }) =>
  courseSummary(await getCourse(studentIdNumber, toInt(params.id))),
)

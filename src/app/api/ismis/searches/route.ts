import { body, json, route } from '@/server/http/api'
import { searchRequest } from '@/server/http/dto'
import { semesterFromCode } from '@/server/domain/model'
import { searchJobs } from '@/server/services/searchJobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = route({ guard: 'ismis' }, async ({ req, sessionId }) => {
  const b = await body(req, searchRequest)
  const jobId = searchJobs().submit(sessionId, semesterFromCode(b.semester), b.academicYear, b.queries)
  return json({ jobId }, 202)
})

import { route } from '@/server/http/api'
import { searchJobs } from '@/server/services/searchJobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'ismis' }, async ({ params }) => {
  const v = searchJobs().view(params.jobId)
  return {
    jobId: v.jobId,
    status: v.status,
    message: v.message,
    items: v.items,
    error: v.errorCode === null ? null : { code: v.errorCode, message: v.errorMessage },
  }
})

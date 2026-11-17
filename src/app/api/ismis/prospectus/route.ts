import { route } from '@/server/http/api'
import { ismisSessions } from '@/server/services/ismisSessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The student's own degree-program curriculum (not what is offered this term): fetched live over their
 * ISMIS session, once, then cached for the rest of the session.
 */
export const GET = route({ guard: 'ismis' }, async ({ sessionId }) => {
  const lease = ismisSessions().lease(sessionId)
  try {
    const p = await lease.connection().prospectus()
    return { programName: p.programName, effectiveYear: p.effectiveYear, courses: p.courses }
  } finally {
    lease.release()
  }
})

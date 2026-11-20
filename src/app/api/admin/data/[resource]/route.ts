import { ResourceNotFoundError } from '@/server/errors'
import { query, route } from '@/server/http/api'
import { listAdmins, listAudit, listConsents, listCourses, listIsmisEvents, listSearches, listSessions, listStudents } from '@/server/services/adminLists'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Paged tables for the admin pages: students, courses, searches, consents, sessions, the audit log, ISMIS failures and the admin list. */
export const GET = route({ guard: 'adminSession' }, async ({ req, params }) => {
  const page = query.int(req, 'page', 0)
  switch (params.resource) {
    case 'students': return listStudents(page)
    case 'courses': return listCourses(page, query.optional(req, 'q') ?? '')
    case 'searches': return listSearches(page)
    case 'consents': return listConsents(page)
    case 'sessions': return listSessions(page)
    case 'audit': return listAudit(page)
    case 'ismis-events': return listIsmisEvents(page)
    case 'admins': return listAdmins(page)
    default: throw new ResourceNotFoundError('Unknown admin table.')
  }
})

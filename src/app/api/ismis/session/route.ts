import { getConfig, isAdminStudent } from '@/server/config'
import { body, noContent, route } from '@/server/http/api'
import { loginRequest } from '@/server/http/dto'
import { ismisSessions } from '@/server/services/ismisSessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Signs in to ISMIS once, using the student's own ISMIS username as their ID number. The password is never
 * stored or logged; only a session id comes back. Request bodies are never logged anywhere in USChed.
 */
export const POST = route({ guard: 'ismis' }, async ({ req }) => {
  const b = await body(req, loginRequest)
  const opened = await ismisSessions().login(b.username, b.password)
  return {
    sessionId: opened.sessionId,
    expiresAt: opened.expiresAt.toISOString(),
    idleMinutes: getConfig().ismisSession.idleMinutes,
    isAdmin: isAdminStudent(b.username),
  }
})

export const DELETE = route({ guard: 'ismis' }, async ({ sessionId }) => {
  ismisSessions().logout(sessionId)
  return noContent()
})

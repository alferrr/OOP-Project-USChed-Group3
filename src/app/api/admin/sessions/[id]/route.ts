import { BadRequestError, noContent, route } from '@/server/http/api'
import { audit } from '@/server/services/adminAudit'
import { ismisSessions } from '@/server/services/ismisSessions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Signs a student out of USChed. Their saved data is untouched; they can simply sign in again. */
export const DELETE = route({ guard: 'adminSession' }, async ({ params, studentIdNumber }) => {
  const target = decodeURIComponent(params.id).trim()
  if (target === '' || target.length > 64) throw new BadRequestError()
  const ended = ismisSessions().endForStudent(target)
  await audit(studentIdNumber, 'END_SESSION', target, `${ended} session${ended === 1 ? '' : 's'}`)
  return noContent()
})

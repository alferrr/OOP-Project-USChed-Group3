import { noContent, route } from '@/server/http/api'
import { removeSaved } from '@/server/services/savedSchedules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const DELETE = route({ guard: 'student' }, async ({ params, studentIdNumber }) => {
  await removeSaved(studentIdNumber, decodeURIComponent(params.key))
  return noContent()
})

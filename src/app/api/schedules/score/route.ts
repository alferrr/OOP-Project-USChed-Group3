import { body, route } from '@/server/http/api'
import { scheduleDto, scoreRequest, toPreference } from '@/server/http/dto'
import { scoreForStudent } from '@/server/services/schedules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Scores a schedule the student built by hand, so it can be saved like a generated one. */
export const POST = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const b = await body(req, scoreRequest)
  return scheduleDto(0, await scoreForStudent(studentIdNumber, b.sectionIds, toPreference(b.preferences)))
})

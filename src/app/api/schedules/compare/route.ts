import { body, route } from '@/server/http/api'
import { compareRequest, statsDto, toPreference } from '@/server/http/dto'
import { compareForStudent } from '@/server/services/schedules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const b = await body(req, compareRequest)
  const ranked = await compareForStudent(studentIdNumber, b.schedules, toPreference(b.preferences))
  return { items: ranked.map((r) => ({ score: r.score, breakdown: r.breakdown, stats: statsDto(r.schedule) })) }
})

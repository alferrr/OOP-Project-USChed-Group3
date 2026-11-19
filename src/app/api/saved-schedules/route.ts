import { z } from 'zod'
import { body, noContent, route } from '@/server/http/api'
import { listSaved, saveSchedule } from '@/server/services/savedSchedules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const saveRequest = z.object({
  name: z.string().trim().min(1, { message: 'must not be blank' }).max(60, { message: 'size must be at most 60' }),
  semester: z.string().min(1).max(6),
  academicYear: z.string().min(1).max(9),
  schedule: z.object({ sections: z.array(z.object({ sectionId: z.number().int() }).passthrough()).min(1).max(20) }).passthrough(),
})

export const GET = route({ guard: 'student' }, async ({ studentIdNumber }) => listSaved(studentIdNumber))

export const PUT = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const b = await body(req, saveRequest)
  await saveSchedule(studentIdNumber, b.name, b.semester, b.academicYear, b.schedule.sections.map((s) => s.sectionId), b.schedule)
  return noContent()
})

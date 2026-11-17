import { body, route } from '@/server/http/api'
import { semesterFromCode } from '@/server/domain/model'
import { generateRequest, scheduleDto, toPreference } from '@/server/http/dto'
import { generateForStudent } from '@/server/services/schedules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const b = await body(req, generateRequest)
  const result = await generateForStudent(
    studentIdNumber,
    b.courseIds,
    semesterFromCode(b.semester),
    b.academicYear,
    b.limit,
    toPreference(b.preferences),
    b.likeSectionIds,
  )
  const schedules = result.ranked.map((r, i) => scheduleDto(i + 1, r))
  return { totalUnits: result.totalUnits, generatedCount: result.generatedCount, returnedCount: schedules.length, schedules }
})

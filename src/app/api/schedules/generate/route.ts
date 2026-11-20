import { body, route } from '@/server/http/api'
import { semesterFromCode } from '@/server/domain/model'
import { generateRequest, scheduleDto, toPreference } from '@/server/http/dto'
import { generateForStudent } from '@/server/services/schedules'
import { recordUsage, usedPreferences } from '@/server/services/usage'

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
  // "More like this" re-runs a search the student already made; only fresh generations count.
  if (!b.likeSectionIds?.length) recordUsage('GENERATE', usedPreferences(b.preferences).join(','), b.courseIds.length)
  const schedules = result.ranked.map((r, i) => scheduleDto(i + 1, r))
  return { totalUnits: result.totalUnits, generatedCount: result.generatedCount, returnedCount: schedules.length, schedules }
})

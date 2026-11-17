import { z } from 'zod'
import { dayFromCode, DAYS, type Meeting, type RankedSchedule, type Schedule, type Section } from '../domain/model'
import { formatTime, parseTime } from '../domain/time'
import { preference, type SchedulePreference } from '../engine/preference'
import { InvalidCourseDataError } from '../errors'
import { roomLabel } from '../domain/model'

// ---- Request bodies ---------------------------------------------------------------------------------------

const notBlank = z.string().refine((s) => s.trim().length > 0, { message: 'must not be blank' })
const id = z.number().int()
const nullableInt = z.number().int().nullish()

// The username becomes the student's catalog key (student_id_number, VARCHAR(64)), so bound it here.
export const loginRequest = z.object({
  username: notBlank.refine((s) => s.length <= 64, { message: 'size must be at most 64' }),
  password: notBlank,
})

export const searchRequest = z.object({
  semester: notBlank,
  academicYear: notBlank,
  queries: z
    .array(notBlank.refine((s) => s.length >= 2 && s.length <= 100, { message: 'size must be between 2 and 100' }))
    .min(1, { message: 'must not be empty' })
    .max(15, { message: 'size must be between 1 and 15' }),
})

export const consentRequest = z.object({
  termsVersion: notBlank,
  agreedTerms: z.boolean().default(false),
  agreedCredentialUse: z.boolean().default(false),
})

const hardPrefs = z.object({
  maxSchoolDays: nullableInt,
  maxClassesPerDay: nullableInt,
  minBreakMinutes: nullableInt,
  earliestStart: z.string().nullish(),
  latestEnd: z.string().nullish(),
  avoidDays: z.array(z.string()).nullish(),
})

const softPrefs = z.object({
  preferMorning: z.boolean().nullish(),
  preferAfternoon: z.boolean().nullish(),
  minimizeGaps: z.boolean().nullish(),
  minimizeDays: z.boolean().nullish(),
  prioritizeLunchBreak: z.boolean().nullish(),
  preferredInstructorIds: z.array(id).nullish(),
})

const preferencesDto = z.object({ hard: hardPrefs.nullish(), soft: softPrefs.nullish() })
type PreferencesDto = z.infer<typeof preferencesDto>

export const generateRequest = z.object({
  courseIds: z.array(id).min(1, { message: 'must not be empty' }),
  semester: notBlank,
  academicYear: notBlank,
  limit: nullableInt,
  preferences: preferencesDto.nullish(),
  likeSectionIds: z.array(id).nullish(),
})

export const compareRequest = z.object({
  schedules: z.array(z.array(id)).min(1, { message: 'must not be empty' }),
  preferences: preferencesDto.nullish(),
})

// ---- Mapping ----------------------------------------------------------------------------------------------

export function toPreference(dto: PreferencesDto | null | undefined): SchedulePreference {
  if (!dto) return preference()
  const hard = dto.hard
  const soft = dto.soft
  return preference({
    ...(hard
      ? {
          maxSchoolDays: positive(hard.maxSchoolDays, 'maxSchoolDays'),
          maxClassesPerDay: positive(hard.maxClassesPerDay, 'maxClassesPerDay'),
          minBreakMinutes: hard.minBreakMinutes == null || hard.minBreakMinutes < 0 ? null : hard.minBreakMinutes,
          earliestStart: time(hard.earliestStart),
          latestEnd: time(hard.latestEnd),
          avoidDays: new Set((hard.avoidDays ?? []).map(dayFromCode)),
        }
      : {}),
    ...(soft
      ? {
          preferMorning: soft.preferMorning === true,
          preferAfternoon: soft.preferAfternoon === true,
          minimizeGaps: soft.minimizeGaps === true,
          minimizeDays: soft.minimizeDays === true,
          prioritizeLunchBreak: soft.prioritizeLunchBreak === true,
          preferredInstructorIds: new Set(soft.preferredInstructorIds ?? []),
        }
      : {}),
  })
}

function positive(v: number | null | undefined, name: string): number | null {
  if (v != null && v < 1) throw new InvalidCourseDataError(`${name} must be at least 1`)
  return v ?? null
}

function time(v: string | null | undefined): number | null {
  if (v == null || v.trim() === '') return null
  return parseTime(v)
}

// ---- Responses --------------------------------------------------------------------------------------------

export function meetingDto(m: Meeting) {
  return {
    day: m.day,
    start: formatTime(m.time.start),
    end: formatTime(m.time.end),
    room: m.room ? roomLabel(m.room) : null,
    type: m.type,
  }
}

export function sectionDto(s: Section) {
  return {
    sectionId: s.id,
    courseCode: s.courseCode,
    courseName: s.courseName,
    units: s.units,
    sectionCode: s.sectionCode,
    instructorId: s.instructor?.id ?? null,
    instructor: s.instructor?.name ?? null,
    availableSlots: s.availableSlots,
    meetings: s.meetings.map(meetingDto),
  }
}

export function statsDto(s: Schedule) {
  const first = s.earliestStart()
  const last = s.latestEnd()
  return {
    schoolDays: s.schoolDays().length,
    earliestStart: first === null ? null : formatTime(first),
    latestEnd: last === null ? null : formatTime(last),
    totalGapMinutes: s.totalGapMinutes(),
    totalUnits: s.totalUnits(),
  }
}

export function scheduleDto(rank: number, r: RankedSchedule) {
  return { rank, score: r.score, breakdown: r.breakdown, stats: statsDto(r.schedule), sections: r.schedule.sections.map(sectionDto) }
}

export const SEMESTER_LABELS = [
  { code: '1ST', label: '1st Semester' },
  { code: '2ND', label: '2nd Semester' },
  { code: 'SUMMER', label: 'Summer' },
] as const

export { DAYS }

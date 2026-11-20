import { prisma } from '../db'

const DAY = 86_400_000

type PrefDto = {
  hard?: {
    maxSchoolDays?: number | null; maxClassesPerDay?: number | null; minBreakMinutes?: number | null
    earliestStart?: string | null; latestEnd?: string | null; avoidDays?: string[] | null; avoidInstructorIds?: number[] | null
  } | null
  soft?: {
    preferMorning?: boolean | null; preferAfternoon?: boolean | null; minimizeGaps?: boolean | null; minimizeDays?: boolean | null
    prioritizeLunchBreak?: boolean | null; preferredInstructorIds?: number[] | null
  } | null
} | null | undefined

export const PREFERENCE_LABELS: Record<string, string> = {
  maxSchoolDays: 'Max school days',
  maxClassesPerDay: 'Max classes per day',
  minBreakMinutes: 'Minimum break',
  earliestStart: 'Earliest start',
  latestEnd: 'Latest end',
  avoidDays: 'Days to avoid',
  avoidInstructors: 'Instructors to avoid',
  preferMorning: 'Prefer mornings',
  preferAfternoon: 'Prefer afternoons',
  minimizeGaps: 'Fewer gaps',
  minimizeDays: 'Fewer school days',
  lunchBreak: 'A real lunch break',
  preferredInstructors: 'Preferred instructors',
}

/** Which kinds of preference a request used (kinds only, never the values). */
export function usedPreferences(p: PrefDto): string[] {
  const h = p?.hard ?? {}
  const s = p?.soft ?? {}
  const used: string[] = []
  if (h.maxSchoolDays != null) used.push('maxSchoolDays')
  if (h.maxClassesPerDay != null) used.push('maxClassesPerDay')
  if (h.minBreakMinutes != null && h.minBreakMinutes > 0) used.push('minBreakMinutes')
  if (h.earliestStart) used.push('earliestStart')
  if (h.latestEnd) used.push('latestEnd')
  if ((h.avoidDays?.length ?? 0) > 0) used.push('avoidDays')
  if ((h.avoidInstructorIds?.length ?? 0) > 0) used.push('avoidInstructors')
  if (s.preferMorning) used.push('preferMorning')
  if (s.preferAfternoon) used.push('preferAfternoon')
  if (s.minimizeGaps) used.push('minimizeGaps')
  if (s.minimizeDays) used.push('minimizeDays')
  if (s.prioritizeLunchBreak) used.push('lunchBreak')
  if ((s.preferredInstructorIds?.length ?? 0) > 0) used.push('preferredInstructors')
  return used
}

/**
 * Notes that something happened, anonymously: what, never who. Fire and forget, so counting can never break
 * a student's request. `detail` must not carry anything a student typed.
 */
export function recordUsage(kind: 'GENERATE' | 'SEARCH', detail: string, count = 0): void {
  void prisma.usageEvent.create({ data: { kind, detail: detail.slice(0, 160), count } }).catch(() => {})
}

export interface UsageInsights {
  generations: { last7d: number; last30d: number; avgCourses: number; withoutPreferences: number }
  topCourses: { code: string; searches: number }[]
  preferences: { key: string; label: string; generations: number; share: number }[]
}

export async function usageInsights(now = new Date()): Promise<UsageInsights> {
  const month = new Date(now.getTime() - 30 * DAY)
  const week = now.getTime() - 7 * DAY
  const events = await prisma.usageEvent.findMany({ where: { createdAt: { gte: month } }, select: { kind: true, detail: true, count: true, createdAt: true } })
  const gens = events.filter((e) => e.kind === 'GENERATE')
  const prefCounts = new Map<string, number>()
  let none = 0
  for (const g of gens) {
    const keys = g.detail ? g.detail.split(',') : []
    if (keys.length === 0) none++
    for (const k of keys) prefCounts.set(k, (prefCounts.get(k) ?? 0) + 1)
  }
  const searches = new Map<string, number>()
  for (const e of events) if (e.kind === 'SEARCH' && e.detail) searches.set(e.detail, (searches.get(e.detail) ?? 0) + 1)
  return {
    generations: {
      last7d: gens.filter((g) => g.createdAt.getTime() >= week).length,
      last30d: gens.length,
      avgCourses: gens.length === 0 ? 0 : Math.round((gens.reduce((n, g) => n + g.count, 0) / gens.length) * 10) / 10,
      withoutPreferences: gens.length === 0 ? 0 : none / gens.length,
    },
    topCourses: [...searches].map(([code, n]) => ({ code, searches: n })).sort((a, b) => b.searches - a.searches || a.code.localeCompare(b.code)).slice(0, 10),
    preferences: [...prefCounts]
      .map(([key, n]) => ({ key, label: PREFERENCE_LABELS[key] ?? key, generations: n, share: gens.length === 0 ? 0 : n / gens.length }))
      .sort((a, b) => b.generations - a.generations),
  }
}

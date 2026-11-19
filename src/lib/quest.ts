import type { Preferences } from '../api/types'

/** What the guide can see of the student's progress. Counts only, never course contents. */
export interface QuestContext {
  selectedCourses: number
  preferences: Preferences
  generated: boolean
  savedSchedules: number
  comparing: number
}

export interface QuestStep {
  id: string
  title: string
  hint: string
  href: string
  xp: number
  isDone: (c: QuestContext) => boolean
}

export const hasAnyPreference = ({ hard, soft }: Preferences): boolean =>
  hard.maxSchoolDays != null || hard.maxClassesPerDay != null || hard.minBreakMinutes != null ||
  !!hard.earliestStart || !!hard.latestEnd || (hard.avoidDays?.length ?? 0) > 0 || (hard.avoidInstructorIds?.length ?? 0) > 0 ||
  !!soft.preferMorning || !!soft.preferAfternoon || !!soft.minimizeGaps || !!soft.minimizeDays || !!soft.prioritizeLunchBreak ||
  (soft.preferredInstructorIds?.length ?? 0) > 0

export const QUEST_STEPS: QuestStep[] = [
  { id: 'courses', title: 'Pick your courses', hint: 'Search by code, like CIS 2105, or add a whole year from your prospectus.', href: '/courses', xp: 20,
    isDone: (c) => c.selectedCourses > 0 },
  { id: 'preferences', title: 'Set a preference', hint: 'Open Preferences and choose a rule, like "no Saturday classes".', href: '/courses', xp: 20,
    isDone: (c) => hasAnyPreference(c.preferences) },
  { id: 'generate', title: 'Generate schedules', hint: 'Press Generate Schedules and USChed ranks the conflict-free options.', href: '/courses', xp: 20,
    isDone: (c) => c.generated },
  { id: 'save', title: 'Save a favorite', hint: 'Found one you like? Save it so it survives regenerating.', href: '/schedules', xp: 20,
    isDone: (c) => c.savedSchedules > 0 },
  { id: 'compare', title: 'Compare two schedules', hint: 'Tick two schedules to see their trade-offs side by side.', href: '/schedules', xp: 20,
    isDone: (c) => c.comparing >= 2 },
]

export const TOTAL_XP = QUEST_STEPS.reduce((n, s) => n + s.xp, 0)

/** Rank titles, one per completed quest (index 0 = none done). */
const LEVELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Cum Laude', 'Dean’s Lister']

export function questProgress(done: ReadonlySet<string>) {
  const steps = QUEST_STEPS.map((s) => ({ ...s, done: done.has(s.id) }))
  const completed = steps.filter((s) => s.done).length
  const xp = steps.reduce((n, s) => n + (s.done ? s.xp : 0), 0)
  return {
    steps,
    completed,
    xp,
    percent: Math.round((xp / TOTAL_XP) * 100),
    level: LEVELS[Math.min(completed, LEVELS.length - 1)],
    current: steps.find((s) => !s.done) ?? null,
    finished: completed === steps.length,
  }
}

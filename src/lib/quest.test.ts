import { describe, expect, it } from 'vitest'
import { emptyPreferences } from '../store/planStore'
import { hasAnyPreference, QUEST_STEPS, questProgress, TOTAL_XP, type QuestContext } from './quest'

const idle: QuestContext = { selectedCourses: 0, preferences: emptyPreferences(), generated: false, savedSchedules: 0, comparing: 0 }

describe('quest steps', () => {
  it('start undone for a brand-new student', () => {
    expect(QUEST_STEPS.some((s) => s.isDone(idle))).toBe(false)
  })

  it('complete from real activity', () => {
    const by = (id: string, ctx: Partial<QuestContext>) => QUEST_STEPS.find((s) => s.id === id)!.isDone({ ...idle, ...ctx })
    expect(by('courses', { selectedCourses: 1 })).toBe(true)
    expect(by('preferences', { preferences: { hard: { avoidDays: ['SAT'] }, soft: {} } })).toBe(true)
    expect(by('generate', { generated: true })).toBe(true)
    expect(by('save', { savedSchedules: 1 })).toBe(true)
    expect(by('compare', { comparing: 1 })).toBe(false)
    expect(by('compare', { comparing: 2 })).toBe(true)
  })

  it('treats empty preferences as not set', () => {
    expect(hasAnyPreference(emptyPreferences())).toBe(false)
    expect(hasAnyPreference({ hard: {}, soft: { preferredInstructorIds: [3] } })).toBe(true)
  })
})

describe('questProgress', () => {
  it('ranks up with each quest and finishes at full XP', () => {
    expect(questProgress(new Set()).level).toBe('Freshman')
    expect(questProgress(new Set(['courses'])).level).toBe('Sophomore')
    const all = questProgress(new Set(QUEST_STEPS.map((s) => s.id)))
    expect(all.finished).toBe(true)
    expect(all.xp).toBe(TOTAL_XP)
    expect(all.percent).toBe(100)
    expect(all.level).toBe('Dean’s Lister')
    expect(all.current).toBeNull()
  })

  it('points at the first unfinished quest', () => {
    expect(questProgress(new Set(['courses'])).current?.id).toBe('preferences')
  })
})

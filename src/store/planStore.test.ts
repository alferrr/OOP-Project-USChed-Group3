import { beforeEach, describe, expect, it } from 'vitest'
import type { CourseSummary, GenerateResponse } from '../api/types'
import { emptyPreferences, usePreferencesStore, useScheduleStore, useSelectionStore, useTermStore } from './planStore'

const course = (id: number): CourseSummary => ({ id, code: `CIS ${id}`, name: `Course ${id}`, units: 3, department: null, prerequisites: null })
const result = (n: number): GenerateResponse => ({ totalUnits: n, generatedCount: 1, returnedCount: 1, schedules: [] })

describe('useTermStore', () => {
  it('sets semester and academic year together', () => {
    useTermStore.getState().setTerm('2ND', '2030-2031')
    expect(useTermStore.getState()).toMatchObject({ semester: '2ND', academicYear: '2030-2031' })
  })
})

describe('useSelectionStore', () => {
  beforeEach(() => useSelectionStore.getState().clear())

  it('toggle adds then removes a course', () => {
    useSelectionStore.getState().toggle(course(1))
    expect(useSelectionStore.getState().selected).toHaveLength(1)
    useSelectionStore.getState().toggle(course(1))
    expect(useSelectionStore.getState().selected).toHaveLength(0)
  })

  it('addMany skips courses that are already selected', () => {
    useSelectionStore.getState().toggle(course(1))
    useSelectionStore.getState().addMany([course(1), course(2)])
    expect(useSelectionStore.getState().selected.map((c) => c.id)).toEqual([1, 2])
  })

  it('remove drops only the given course', () => {
    useSelectionStore.getState().addMany([course(1), course(2)])
    useSelectionStore.getState().remove(1)
    expect(useSelectionStore.getState().selected.map((c) => c.id)).toEqual([2])
  })
})

describe('usePreferencesStore', () => {
  it('reset restores empty preferences', () => {
    usePreferencesStore.getState().setPreferences({ hard: { avoidDays: ['MON'] }, soft: {} })
    usePreferencesStore.getState().reset()
    expect(usePreferencesStore.getState().preferences).toEqual(emptyPreferences())
  })
})

describe('useScheduleStore', () => {
  beforeEach(() => useScheduleStore.getState().reset())

  it('setSimilarResult keeps baseResult, and backToAll restores it', () => {
    const s = useScheduleStore.getState()
    s.setResult(result(1))
    s.setSimilarResult(result(2), 3)
    expect(useScheduleStore.getState()).toMatchObject({ showingSimilarTo: 3 })
    expect(useScheduleStore.getState().result?.totalUnits).toBe(2)
    expect(useScheduleStore.getState().baseResult?.totalUnits).toBe(1)
    useScheduleStore.getState().backToAll()
    expect(useScheduleStore.getState().result?.totalUnits).toBe(1)
    expect(useScheduleStore.getState().showingSimilarTo).toBeNull()
  })

  it('backToAll does nothing without a base result', () => {
    useScheduleStore.getState().backToAll()
    expect(useScheduleStore.getState().result).toBeNull()
  })

  it('toggleCompare toggles ranks and caps at four', () => {
    const t = (r: number) => useScheduleStore.getState().toggleCompare(r)
    ;[1, 2, 3, 4, 5].forEach(t)
    expect(useScheduleStore.getState().compareRanks).toEqual([1, 2, 3, 4])
    t(2)
    expect(useScheduleStore.getState().compareRanks).toEqual([1, 3, 4])
  })

  it('a new result clears compare picks and resets the active index', () => {
    useScheduleStore.getState().toggleCompare(1)
    useScheduleStore.getState().setActive(2)
    useScheduleStore.getState().setResult(result(1))
    expect(useScheduleStore.getState()).toMatchObject({ compareRanks: [], activeIndex: 0 })
  })
})

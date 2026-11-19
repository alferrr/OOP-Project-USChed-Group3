import { describe, expect, it } from 'vitest'
import { queryClient } from '../api/queryClient'
import { clearStudentData } from './resetAll'
import { usePassedStore, usePreferencesStore, useSavedStore, useScheduleStore, useSelectionStore } from './planStore'

describe('clearStudentData', () => {
  it('wipes the query cache and every per-student store', () => {
    queryClient.setQueryData(['x'], 1)
    useSelectionStore.getState().addMany([{ id: 1, code: 'CIS 1', name: 'n', units: 3, department: null, prerequisites: null }])
    useScheduleStore.getState().setResult({ totalUnits: 3, generatedCount: 1, returnedCount: 1, schedules: [] })
    usePreferencesStore.getState().setPreferences({ hard: { avoidDays: ['MON'] }, soft: {} })
    usePassedStore.getState().addMany(['CIS 1101'])
    useSavedStore.getState().save({ rank: 1, score: 1, breakdown: {}, sections: [], stats: { schoolDays: 0, earliestStart: null, latestEnd: null, totalGapMinutes: 0, totalUnits: 0 } }, '1ST', '2026-2027', 'Test')

    clearStudentData()

    expect(queryClient.getQueryData(['x'])).toBeUndefined()
    expect(useSelectionStore.getState().selected).toEqual([])
    expect(useScheduleStore.getState().result).toBeNull()
    expect(usePassedStore.getState().passed).toEqual([])
    expect(useSavedStore.getState().saved).toEqual([])
    expect(usePreferencesStore.getState().preferences).toEqual({ hard: { avoidDays: [] }, soft: {} })
  })
})

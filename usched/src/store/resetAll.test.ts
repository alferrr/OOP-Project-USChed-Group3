import { describe, expect, it } from 'vitest'
import { queryClient } from '../api/queryClient'
import { clearStudentData } from './resetAll'
import { usePreferencesStore, useScheduleStore, useSelectionStore } from './planStore'

describe('clearStudentData', () => {
  it('wipes the query cache and every per-student store', () => {
    queryClient.setQueryData(['x'], 1)
    useSelectionStore.getState().addMany([{ id: 1, code: 'CIS 1', name: 'n', units: 3, department: null, prerequisites: null }])
    useScheduleStore.getState().setResult({ totalUnits: 3, generatedCount: 1, returnedCount: 1, schedules: [] })
    usePreferencesStore.getState().setPreferences({ hard: { avoidDays: ['MON'] }, soft: {} })

    clearStudentData()

    expect(queryClient.getQueryData(['x'])).toBeUndefined()
    expect(useSelectionStore.getState().selected).toEqual([])
    expect(useScheduleStore.getState().result).toBeNull()
    expect(usePreferencesStore.getState().preferences).toEqual({ hard: { avoidDays: [] }, soft: {} })
  })
})

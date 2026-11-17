import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIsmisSignIn, useIsmisSignOut } from './hooks'
import { queryClient } from './queryClient'
import { useIsmisStore } from '../store/ismisStore'
import { useSelectionStore, useScheduleStore, usePreferencesStore } from '../store/planStore'

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('cross-student cache isolation', () => {
  beforeEach(() => {
    // Simulate student A's already-fetched data and picks sitting in browser state.
    queryClient.setQueryData(['prospectus'], { programName: 'BSIT (student A)', effectiveYear: '2023', courses: [] })
    queryClient.setQueryData(['courses', { q: '' }], { items: [{ code: 'CIS 2105' }], page: 0, size: 12, total: 1 })
    useSelectionStore.getState().addMany([{ id: 1, code: 'CIS 2105', name: 'x', units: 3, department: null, prerequisites: null }])
    useScheduleStore.getState().setResult({ totalUnits: 6, generatedCount: 1, returnedCount: 1, schedules: [] })
    usePreferencesStore.getState().setPreferences({ hard: { maxSchoolDays: 3, avoidDays: [] }, soft: {} })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('wipes the query cache when a different student signs in, so their data is fetched fresh', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ consentToken: 't', expiresAt: '2099-01-01' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ sessionId: 's-B', expiresAt: '2099-01-01', idleMinutes: 20 }) }))

    expect(queryClient.getQueryData(['prospectus'])).toBeDefined()
    const { result } = renderHook(() => useIsmisSignIn(), { wrapper })
    result.current.mutate({ termsVersion: 'v1', username: 'student-B', password: 'pw' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(['prospectus'])).toBeUndefined()
    expect(queryClient.getQueryData(['courses', { q: '' }])).toBeUndefined()
    expect(useSelectionStore.getState().selected).toEqual([])
    expect(useScheduleStore.getState().result).toBeNull()
    expect(usePreferencesStore.getState().preferences).toEqual({ hard: { avoidDays: [] }, soft: {} })
    expect(useIsmisStore.getState().sessionId).toBe('s-B')
  })

  it('wipes the query cache on sign-out too', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no body') } }))
    expect(queryClient.getQueryData(['prospectus'])).toBeDefined()
    const { result } = renderHook(() => useIsmisSignOut(), { wrapper })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))
    expect(queryClient.getQueryData(['prospectus'])).toBeUndefined()
    expect(useSelectionStore.getState().selected).toEqual([])
    expect(useScheduleStore.getState().result).toBeNull()
  })
})

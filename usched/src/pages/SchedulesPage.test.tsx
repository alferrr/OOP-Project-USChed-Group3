import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerateResponse } from '../api/types'
import SchedulesPage from './SchedulesPage'
import { useScheduleStore, useSelectionStore } from '../store/planStore'

const mutate = vi.fn()
vi.mock('../api/hooks', () => ({
  useCompare: () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined }),
  useGenerate: () => ({ mutate, isPending: false, error: null }),
}))

const schedule = (rank: number, sectionId: number): GenerateResponse['schedules'][number] => ({
  rank, score: 90 - rank, breakdown: { Compact: 0.9 },
  stats: { schoolDays: 2, earliestStart: '08:00', latestEnd: '15:00', totalGapMinutes: 30, totalUnits: 6 },
  sections: [{
    sectionId, courseCode: 'CIS 2105', courseName: 'Networking II', units: 3, sectionCode: 'A',
    instructorId: null, instructor: null, availableSlots: null,
    meetings: [{ day: 'MON', start: '08:00', end: '09:30', room: 'LB 1', type: 'LECTURE' }],
  }],
})
const result: GenerateResponse = { totalUnits: 6, generatedCount: 3, returnedCount: 2, schedules: [schedule(1, 101), schedule(2, 102)] }

describe('SchedulesPage "More like this"', () => {
  beforeEach(() => {
    mutate.mockClear()
    act(() => {
      useScheduleStore.getState().reset()
      useScheduleStore.getState().setResult(result)
      useSelectionStore.getState().clear()
      useSelectionStore.getState().addMany([{ id: 1, code: 'CIS 2105', name: 'Networking II', units: 3, department: null, prerequisites: null }])
    })
  })

  it('shows no banner and no "Back to all results" until More like this is used', () => {
    render(<SchedulesPage />, { wrapper: MemoryRouter })
    expect(screen.queryByText(/showing schedules similar to/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back to all results/i })).not.toBeInTheDocument()
  })

  it('requests similar schedules using the active schedule\'s own sections', async () => {
    const user = userEvent.setup()
    render(<SchedulesPage />, { wrapper: MemoryRouter })
    await user.click(screen.getByRole('button', { name: /more like this/i }))
    expect(mutate).toHaveBeenCalledTimes(1)
    const [request] = mutate.mock.calls[0]
    expect(request.courseIds).toEqual([1])
    expect(request.likeSectionIds).toEqual([101]) // schedule #1's own section
  })

  it('shows a banner and can return to the original results', () => {
    act(() => {
      useScheduleStore.getState().setSimilarResult(
        { totalUnits: 6, generatedCount: 1, returnedCount: 1, schedules: [schedule(1, 103)] }, 1,
      )
    })
    render(<SchedulesPage />, { wrapper: MemoryRouter })
    expect(screen.getByText(/showing schedules similar to #1/i)).toBeInTheDocument()

    const backButton = screen.getByRole('button', { name: /back to all results/i })
    act(() => backButton.click())
    expect(useScheduleStore.getState().showingSimilarTo).toBeNull()
    expect(useScheduleStore.getState().result).toEqual(result)
  })
})

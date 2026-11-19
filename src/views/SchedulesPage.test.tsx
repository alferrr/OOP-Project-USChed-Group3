import { act } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerateResponse } from '../api/types'
import SchedulesPage from './SchedulesPage'
import { useSavedStore, useScheduleStore, useSelectionStore } from '../store/planStore'

const mutate = vi.fn()
vi.mock('../api/hooks', async () => {
  const { useSavedStore: saved } = await import('../store/planStore')
  return {
    useCompare: () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined }),
    useGenerate: () => ({ mutate, isPending: false, error: null }),
    useSyncSavedSchedules: () => ({ isLoading: false }),
    useSavedActions: () => ({
      save: (s: never, sem: never, y: string) => saved.getState().save(s, sem, y),
      remove: (item: { id: string }) => saved.getState().remove(item.id),
      error: null,
    }),
  }
})

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
    render(<SchedulesPage />)
    expect(screen.queryByText(/showing schedules similar to/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /back to all results/i })).not.toBeInTheDocument()
  })

  it('requests similar schedules using the active schedule\'s own sections', async () => {
    const user = userEvent.setup()
    render(<SchedulesPage />)
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
    render(<SchedulesPage />)
    expect(screen.getByText(/showing schedules similar to #1/i)).toBeInTheDocument()

    const backButton = screen.getByRole('button', { name: /back to all results/i })
    act(() => backButton.click())
    expect(useScheduleStore.getState().showingSimilarTo).toBeNull()
    expect(useScheduleStore.getState().result).toEqual(result)
  })
})

describe('SchedulesPage printing', () => {
  beforeEach(() => {
    act(() => {
      useScheduleStore.getState().reset()
      useScheduleStore.getState().setResult(result)
    })
  })

  it('marks everything but the schedule itself as print:hidden', () => {
    render(<SchedulesPage />)

    // The switcher (choosing among schedules) and the page intro are UI, not part of the schedule.
    expect(screen.getByRole('list', { name: /ranked schedules/i }).closest('.print\\:hidden')).not.toBeNull()
    expect(screen.getByText(/conflict-free/).closest('.print\\:hidden')).not.toBeNull()
    // Score breakdown is meta-analysis, not the schedule itself.
    expect(screen.getByText('Score breakdown').closest('.print\\:hidden')).not.toBeNull()

    // The calendar and the section list ARE the schedule: they must stay visible when printing.
    expect(screen.getByTestId('col-MON').closest('.print\\:hidden')).toBeNull()
    expect(screen.getByText('Sections').closest('.print\\:hidden')).toBeNull()
  })

  it('the print button calls window.print', async () => {
    const user = userEvent.setup()
    const printSpy = vi.fn()
    window.print = printSpy
    render(<SchedulesPage />)
    await user.click(screen.getByRole('button', { name: /^print$/i }))
    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})

describe('SchedulesPage saving and sharing', () => {
  beforeEach(() => {
    act(() => {
      useScheduleStore.getState().reset()
      useScheduleStore.getState().setResult(result)
      useSavedStore.getState().clear()
    })
  })

  it('saves the active schedule, lists it, and removes it again', async () => {
    const user = userEvent.setup()
    render(<SchedulesPage />)
    expect(screen.queryByRole('list', { name: 'Saved schedules' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('list', { name: 'Saved schedules' })).toHaveTextContent('CIS 2105')

    await user.click(screen.getByRole('button', { name: /remove saved schedule/i }))
    expect(useSavedStore.getState().saved).toEqual([])
  })

  it('still shows saved schedules when there are no fresh results (e.g. after signing in again)', () => {
    act(() => {
      useScheduleStore.getState().reset()
      useSavedStore.getState().save(result.schedules[0], '1ST', '2026-2027')
    })
    render(<SchedulesPage />)
    expect(screen.getByRole('heading', { name: /your saved schedules/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Saved schedules' })).toHaveTextContent('CIS 2105')
    expect(screen.queryByRole('button', { name: /more like this/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument()
  })

  it('saving the same schedule twice keeps one copy', () => {
    act(() => {
      useSavedStore.getState().save(result.schedules[0], '1ST', '2026-2027')
      useSavedStore.getState().save(result.schedules[0], '1ST', '2026-2027')
    })
    expect(useSavedStore.getState().saved).toHaveLength(1)
  })

  it('shows a share link containing the schedule, never a server id', async () => {
    const user = userEvent.setup()
    render(<SchedulesPage />)
    await user.click(screen.getByRole('button', { name: /copy link/i }))
    const input = screen.getByLabelText('Share link') as HTMLInputElement
    expect(input.value).toMatch(/\/shared#[A-Za-z0-9_-]+$/)
  })
})

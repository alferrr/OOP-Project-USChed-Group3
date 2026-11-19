import { act } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RankedSchedule } from '../api/types'
import { useSavedStore } from '../store/planStore'
import SavedSchedulesPage from './SavedSchedulesPage'

const remove = vi.fn()
vi.mock('../api/hooks', () => ({
  useSyncSavedSchedules: () => ({ isLoading: false, isError: false }),
  useSavedActions: () => ({ save: vi.fn(), remove, error: null }),
}))

const schedule = (sectionId: number, code: string): RankedSchedule => ({
  rank: 1, score: 88, breakdown: { Compact: 0.9 },
  stats: { schoolDays: 2, earliestStart: '08:00', latestEnd: '15:00', totalGapMinutes: 30, totalUnits: 3 },
  sections: [{
    sectionId, courseCode: code, courseName: `${code} name`, units: 3, sectionCode: 'A', instructorId: null, instructor: null, availableSlots: null,
    meetings: [{ day: 'MON', start: '08:00', end: '09:30', room: 'LB 1', type: 'LECTURE' }],
  }],
})

beforeEach(() => {
  remove.mockClear()
  act(() => {
    useSavedStore.getState().clear()
    useSavedStore.getState().save(schedule(1, 'CIS 2105'), '1ST', '2026-2027', 'Light Fridays')
    useSavedStore.getState().save(schedule(2, 'MATH 101'), '2ND', '2026-2027', 'Backup plan')
  })
})

describe('SavedSchedulesPage', () => {
  it('shows each saved schedule as a named preview card without opening the full schedule', () => {
    render(<SavedSchedulesPage />)
    const list = screen.getByRole('list', { name: 'Saved schedules' })
    expect(within(list).getByText('Light Fridays')).toBeInTheDocument()
    expect(within(list).getByText('Backup plan')).toBeInTheDocument()
    expect(within(list).getByText(/1st sem 2026-2027/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /weekly schedule/i })).not.toBeInTheDocument()
  })

  it('opens the full schedule when a card is clicked, and closes it again', async () => {
    const user = userEvent.setup()
    render(<SavedSchedulesPage />)
    await user.click(screen.getByRole('button', { name: 'Open Light Fridays' }))
    const dialog = screen.getByRole('dialog', { name: 'Light Fridays' })
    expect(within(dialog).getByRole('region', { name: /weekly schedule/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('removes a schedule from its full view', async () => {
    const user = userEvent.setup()
    render(<SavedSchedulesPage />)
    await user.click(screen.getByRole('button', { name: 'Open Backup plan' }))
    await user.click(screen.getByRole('button', { name: /remove/i }))
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ name: 'Backup plan' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an empty state with a way to start', () => {
    act(() => useSavedStore.getState().clear())
    render(<SavedSchedulesPage />)
    expect(screen.getByText('No saved schedules yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /choose your courses/i })).toBeInTheDocument()
  })
})

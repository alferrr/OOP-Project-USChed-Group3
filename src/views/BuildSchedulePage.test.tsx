import { act } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Section } from '../api/types'
import { useBuildStore, useSelectionStore } from '../store/planStore'
import BuildSchedulePage from './BuildSchedulePage'

const sec = (id: number, code: string, sectionCode: string, day: string, start: string, end: string): Section => ({
  sectionId: id, courseCode: code, courseName: `${code} name`, units: 3, sectionCode, instructorId: null, instructor: 'DOE, JANE', availableSlots: 20,
  meetings: [{ day: day as never, start, end, room: 'R1', type: 'LECTURE' }],
})
const sections = new Map<number, Section[]>([
  [1, [sec(11, 'CIS 2105', 'A', 'MON', '08:00', '09:30'), sec(12, 'CIS 2105', 'B', 'TUE', '08:00', '09:30')]],
  [2, [sec(21, 'MATH 101', 'A', 'MON', '09:00', '10:30'), sec(22, 'MATH 101', 'B', 'WED', '09:00', '10:30')]],
])
const score = vi.fn()
const save = vi.fn()
vi.mock('../api/hooks', () => ({
  useSectionsOf: () => ({ byCourse: sections, loading: false, failed: false }),
  useScoreSchedule: () => ({ mutate: score, isPending: false, isError: false, error: null }),
  useSavedActions: () => ({ save, remove: vi.fn(), error: null }),
  useSyncSavedSchedules: () => ({ isLoading: false }),
}))

beforeEach(() => {
  score.mockReset()
  save.mockReset()
  act(() => {
    useBuildStore.getState().clear()
    useSelectionStore.getState().clear()
    useSelectionStore.getState().addMany([
      { id: 1, code: 'CIS 2105', name: 'Networking II', units: 3, department: null, prerequisites: null },
      { id: 2, code: 'MATH 101', name: 'Calculus', units: 3, department: null, prerequisites: null },
    ])
  })
})

describe('BuildSchedulePage', () => {
  it('sends a student with no courses back to pick some', () => {
    act(() => useSelectionStore.getState().clear())
    render(<BuildSchedulePage />)
    expect(screen.getByRole('link', { name: /choose your courses/i })).toHaveAttribute('href', '/courses')
  })

  it('fills in the summary as sections are picked', async () => {
    const user = userEvent.setup()
    render(<BuildSchedulePage />)
    expect(screen.getByText('0 of 2 courses placed')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'CIS 2105 section A' }))
    expect(screen.getByText('1 of 2 courses placed')).toBeInTheDocument()
    expect(screen.getByText('3 units')).toBeInTheDocument()
  })

  it('flags a section that would clash before it is picked, and blocks saving a clashing pick', async () => {
    const user = userEvent.setup()
    render(<BuildSchedulePage />)
    await user.click(screen.getByRole('radio', { name: 'CIS 2105 section A' }))
    expect(screen.getByText('Clashes with CIS 2105')).toBeInTheDocument() // MATH 101 A overlaps it
    await user.click(screen.getByRole('radio', { name: 'MATH 101 section A' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/can't be saved/i)
    expect(screen.getByRole('button', { name: 'Save schedule' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'MATH 101 section B' }))
    expect(screen.getByRole('button', { name: 'Save schedule' })).toBeEnabled()
  })

  it('names, scores on the server, then saves the schedule', async () => {
    const user = userEvent.setup()
    const ranked = { rank: 0, score: 80, breakdown: {}, stats: { schoolDays: 2, earliestStart: '08:00', latestEnd: '10:30', totalGapMinutes: 0, totalUnits: 6 }, sections: [] }
    score.mockImplementation((_v, opts) => opts.onSuccess(ranked))
    render(<BuildSchedulePage />)
    await user.click(screen.getByRole('radio', { name: 'CIS 2105 section A' }))
    await user.click(screen.getByRole('radio', { name: 'MATH 101 section B' }))
    await user.click(screen.getByRole('button', { name: 'Save schedule' }))
    const dialog = screen.getByRole('dialog', { name: /name this schedule/i })
    await user.clear(within(dialog).getByLabelText('Schedule name'))
    await user.type(within(dialog).getByLabelText('Schedule name'), 'My own plan')
    await user.click(within(dialog).getByRole('button', { name: 'Save schedule' }))
    expect(score).toHaveBeenCalledWith(expect.objectContaining({ sectionIds: [11, 22] }), expect.anything())
    expect(save).toHaveBeenCalledWith(ranked, '1ST', expect.any(String), 'My own plan')
    expect(screen.getByRole('status')).toHaveTextContent('Saved as “My own plan”')
  })
})

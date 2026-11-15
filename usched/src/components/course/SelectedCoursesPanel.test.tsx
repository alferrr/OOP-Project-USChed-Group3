import { act } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prospectus, Section } from '../../api/types'
import SelectedCoursesPanel from './SelectedCoursesPanel'
import { usePassedStore, useSelectionStore } from '../../store/planStore'

const course = (id: number, code: string) => ({ id, code, name: code + ' name', units: 3, department: null, prerequisites: null })

const geFelSections: Section[] = [
  { sectionId: 1, courseCode: 'GE-FEL', courseName: 'Art Appreciation', units: 3, sectionCode: 'Group 1',
    instructorId: null, instructor: 'Dr. Cruz', availableSlots: 10,
    meetings: [{ day: 'MON', start: '08:00', end: '09:30', room: 'AVR 1', type: 'LECTURE' }] },
  { sectionId: 2, courseCode: 'GE-FEL', courseName: 'Entrepreneurial Mind', units: 3, sectionCode: 'Group 2',
    instructorId: null, instructor: 'Dr. Reyes', availableSlots: 5,
    meetings: [{ day: 'TUE', start: '10:00', end: '11:30', room: 'AVR 2', type: 'LECTURE' }] },
]

let prospectusData: Prospectus | undefined

vi.mock('../../api/hooks', () => ({
  useProspectus: () => ({ data: prospectusData }),
  useSections: (_courseId: number, _sem: string, _year: string, enabled: boolean) => ({
    data: enabled ? geFelSections : undefined,
    isLoading: false,
  }),
}))

describe('SelectedCoursesPanel', () => {
  beforeEach(() => {
    act(() => { useSelectionStore.getState().clear(); usePassedStore.getState().clear() })
    prospectusData = undefined
  })

  const prospectus = (): Prospectus => ({
    programName: 'BSIT', effectiveYear: '2023',
    courses: [
      { yearLevel: 1, semester: '1ST', code: 'CIS 1101', title: 'PROGRAMMING I', units: 3, requisiteNote: '' },
      { yearLevel: 1, semester: '2ND', code: 'CIS 1201', title: 'PROGRAMMING II', units: 3, requisiteNote: 'PREREQUISITE CIS 1101' },
    ],
  })

  it('warns when a selected course has a prerequisite not marked passed, and stops once it is', () => {
    prospectusData = prospectus()
    act(() => { useSelectionStore.getState().addMany([course(1, 'CIS 1201')]) })
    render(<SelectedCoursesPanel />)
    expect(screen.getByRole('alert')).toHaveTextContent('CIS 1101')

    act(() => { usePassedStore.getState().addMany(['CIS 1101']) })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows no warning before the prospectus has been loaded', () => {
    act(() => { useSelectionStore.getState().addMany([course(1, 'CIS 1201')]) })
    render(<SelectedCoursesPanel />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows no "Clear all" button when nothing is selected', () => {
    render(<SelectedCoursesPanel />)
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })

  it('clears every selected course when "Clear all" is clicked', async () => {
    const user = userEvent.setup()
    act(() => { useSelectionStore.getState().addMany([course(1, 'CIS 2105'), course(2, 'MATH 1101')]) })
    render(<SelectedCoursesPanel />)
    expect(screen.getByText('CIS 2105')).toBeInTheDocument()
    expect(screen.getByText('MATH 1101')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.queryByText('CIS 2105')).not.toBeInTheDocument()
    expect(screen.queryByText('MATH 1101')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing selected yet.')).toBeInTheDocument()
    expect(useSelectionStore.getState().selected).toEqual([])
  })

  it('drills down from the code to a specific course to its schedule', async () => {
    const user = userEvent.setup()
    act(() => { useSelectionStore.getState().addMany([course(3, 'GE-FEL')]) })
    render(<SelectedCoursesPanel />)

    expect(screen.queryByLabelText('Course under GE-FEL')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sections of GE-FEL' }))

    const courseSelect = screen.getByLabelText('Course under GE-FEL')
    expect(screen.getByRole('option', { name: 'Art Appreciation' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Entrepreneurial Mind' })).toBeInTheDocument()

    await user.selectOptions(courseSelect, 'Art Appreciation')

    const scheduleSelect = screen.getByLabelText('Schedule for Art Appreciation')
    expect(scheduleSelect).toHaveTextContent('Group 1')
    expect(scheduleSelect).toHaveTextContent('AVR 1')
    expect(scheduleSelect).not.toHaveTextContent('Entrepreneurial Mind')
  })
})

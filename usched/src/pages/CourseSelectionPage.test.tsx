import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoursePage } from '../api/types'
import CourseSelectionPage from './CourseSelectionPage'
import { useSelectionStore } from '../store/planStore'

const clearMutate = vi.fn((_v: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.())
let coursesData: CoursePage = { items: [{ id: 1, code: 'CIS 2105', name: 'Networking II', units: 3, department: null, prerequisites: null }], page: 0, size: 12, total: 1 }
const useCoursesSpy = vi.fn(() => ({ data: coursesData, isLoading: false }))

vi.mock('../api/hooks', () => ({
  useAcademicYears: () => ({ data: ['2026-2027'] }),
  useSemesters: () => ({ data: [{ code: '1ST', label: '1st Semester' }] }),
  useDepartments: () => ({ data: [] }),
  useCourses: (p: unknown) => useCoursesSpy(p),
  useSearchStatus: () => ({ data: undefined }),
  useStartSearch: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useGenerate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useClearCatalog: () => ({ mutate: clearMutate, isPending: false }),
  useProspectus: () => ({ data: undefined, isLoading: false, error: null }),
  useSections: () => ({ data: undefined, isLoading: false }),
}))

describe('CourseSelectionPage "Clear saved courses"', () => {
  beforeEach(() => {
    clearMutate.mockClear()
    coursesData = { items: [{ id: 1, code: 'CIS 2105', name: 'Networking II', units: 3, department: null, prerequisites: null }], page: 0, size: 12, total: 1 }
    act(() => {
      useSelectionStore.getState().clear()
      useSelectionStore.getState().addMany([{ id: 1, code: 'CIS 2105', name: 'Networking II', units: 3, department: null, prerequisites: null }])
    })
  })

  it('shows no "Clear saved courses" button when the catalog is empty', () => {
    coursesData = { items: [], page: 0, size: 12, total: 0 }
    render(<CourseSelectionPage />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('button', { name: 'Clear saved courses' })).not.toBeInTheDocument()
  })

  it('clears the fetched catalog and the current selection when clicked', async () => {
    const user = userEvent.setup()
    render(<CourseSelectionPage />, { wrapper: MemoryRouter })

    await user.click(screen.getByRole('button', { name: 'Clear saved courses' }))

    expect(clearMutate).toHaveBeenCalled()
    await waitFor(() => expect(useSelectionStore.getState().selected).toEqual([]))
  })

  it('fetches a large enough page that a big family does not spill across several "pages"', () => {
    render(<CourseSelectionPage />, { wrapper: MemoryRouter })
    expect(useCoursesSpy).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }))
  })
})

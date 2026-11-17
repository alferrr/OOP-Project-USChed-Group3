import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminCoursesPage } from './AdminTables'

const useAdminTable = vi.fn()
vi.mock('../../api/hooks', () => ({ useAdminTable: (...a: unknown[]) => useAdminTable(...a) }))

const result = (items: unknown[], total = items.length) => ({
  data: { items, total, page: 0, size: 15 }, isError: false, isFetching: false, isLoading: false, dataUpdatedAt: Date.now(), refetch: vi.fn(),
})

describe('admin table pages', () => {
  it('renders rows with a pager and sends the search text', async () => {
    useAdminTable.mockReturnValue(result([{ code: 'CIS 2105', name: 'Data Structures', department: 'CIS', units: 3, students: 7 }], 31))
    render(<AdminCoursesPage />)
    expect(screen.getByText('CIS 2105')).toBeInTheDocument()
    expect(screen.getByText('1–15 of 31')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await userEvent.type(screen.getByRole('searchbox'), 'data')
    await vi.waitFor(() => expect(useAdminTable).toHaveBeenLastCalledWith('courses', 0, 'data'))
  })

  it('shows the empty message', () => {
    useAdminTable.mockReturnValue(result([]))
    render(<AdminCoursesPage />)
    expect(screen.getByText('No courses match.')).toBeInTheDocument()
  })
})

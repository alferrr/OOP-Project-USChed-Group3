import { act } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoursePage } from '../../api/types'
import CourseList from './CourseList'
import { useSelectionStore } from '../../store/planStore'

const course = (id: number, code: string) => ({ id, code, name: code + ' name', units: 3, department: null, prerequisites: null })

/** The group card fetches its own complete family list, independent of whatever page triggered it. */
let catalog: ReturnType<typeof course>[] = []

vi.mock('../../api/hooks', () => ({
  useSections: () => ({ data: [], isLoading: false }),
  useCourses: (p: { q: string }) => {
    const items = catalog.filter((c) => c.code.toLowerCase().includes(p.q.toLowerCase()))
    return { data: { items, page: 0, size: 100, total: items.length }, isLoading: false }
  },
}))

const page = (items: ReturnType<typeof course>[]): CoursePage => ({ items, page: 0, size: 12, total: items.length })

describe('CourseList', () => {
  beforeEach(() => {
    act(() => { useSelectionStore.getState().clear() })
  })

  it('collapses same-family courses into a single dropdown instead of listing them one by one', () => {
    catalog = [course(1, 'CIS 2105'), course(2, 'GE-FEL AIS'), course(3, 'GE-FEL AMSR'), course(4, 'GE-FEL BFI')]
    render(<CourseList data={page(catalog)} loading={false} semester="1ST" academicYear="2026-2027" onPage={vi.fn()} />)

    expect(screen.getByText('CIS 2105')).toBeInTheDocument()
    expect(screen.getByText('GE-FEL')).toBeInTheDocument()
    expect(screen.getByText('3 courses offered')).toBeInTheDocument()
    expect(screen.queryByText('GE-FEL AIS')).not.toBeInTheDocument()
    expect(screen.queryByText('GE-FEL AMSR')).not.toBeInTheDocument()
  })

  it('reveals the individual courses only once the group is expanded, in a scrollable box', async () => {
    const user = userEvent.setup()
    catalog = [course(2, 'GE-FEL AIS'), course(3, 'GE-FEL AMSR')]
    render(<CourseList data={page(catalog)} loading={false} semester="1ST" academicYear="2026-2027" onPage={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Courses under GE-FEL' }))

    expect(screen.getByText('GE-FEL AIS')).toBeInTheDocument()
    expect(screen.getByText('GE-FEL AIS').closest('.overflow-y-auto')).not.toBeNull()
  })

  it('shows every offering in the family even when only some of them are on the visible page', async () => {
    const user = userEvent.setup()
    // The full catalog has 8 GE-FEL offerings, but this page only surfaces 2 of them.
    catalog = Array.from({ length: 8 }, (_, i) => course(i + 1, `GE-FEL ${String.fromCharCode(65 + i)}`))
    render(<CourseList data={page(catalog.slice(0, 2))} loading={false} semester="1ST" academicYear="2026-2027" onPage={vi.fn()} />)

    expect(screen.getByText('8 courses offered')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Courses under GE-FEL' }))
    for (const c of catalog) expect(screen.getByText(c.code)).toBeInTheDocument()
  })

  it('does not group a lone course that merely looks like a family slot', () => {
    catalog = [course(1, 'GE-FEL AIS'), course(2, 'CIS 2105')]
    render(<CourseList data={page(catalog)} loading={false} semester="1ST" academicYear="2026-2027" onPage={vi.fn()} />)

    expect(screen.getByText('GE-FEL AIS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Courses under/ })).not.toBeInTheDocument()
  })
})

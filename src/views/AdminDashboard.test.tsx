import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminStats } from '../api/types'
import { useIsmisStore } from '../store/ismisStore'
import AdminDashboard from './AdminDashboard'

const stats: AdminStats = {
  generatedAt: new Date().toISOString(),
  kpis: { students: 42, courses: 310, sections: 900, instructors: 20, activeSessions: 3, maxSessions: 100, searchesThisWeek: 12, searchesLastWeek: 10, consentsThisWeek: 5, consentsLastWeek: 5 },
  searchesByMonth: Array.from({ length: 12 }, (_, i) => ({ month: `2026-${i + 1}`, label: `M${i + 1}`, searches: i, students: i })),
  topDepartments: [{ department: 'CIS', courses: 30 }],
  terms: [{ semester: '1ST', academicYear: '2026-2027', searches: 4, sections: 500 }],
  retention: { rate: 0.5, returning: 21, total: 42 },
  recent: [{ student: '19****41', semester: '1ST', academicYear: '2026-2027', courses: 5, sections: 12, at: new Date().toISOString() }],
}

vi.mock('../api/hooks', () => ({
  useAdminStats: () => ({ data: stats, isError: false, isFetching: false, refetch: vi.fn() }),
}))

describe('AdminDashboard', () => {
  it('shows the headline numbers, the chart and the lists', () => {
    useIsmisStore.setState({ sessionId: 'x', isAdmin: true })
    render(<AdminDashboard />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('310')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Searches per month' })).toBeInTheDocument()
    expect(screen.getByText('19****41')).toBeInTheDocument()
    expect(screen.getByText('CIS')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})

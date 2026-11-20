import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminAdminsPage, AdminAnnouncementPage, AdminHealthPage, AdminImportPage, AdminInsightsPage } from './AdminTools'
import DeleteStudentDialog from '../../components/admin/DeleteStudentDialog'

const q = (data: unknown) => ({ data, isError: false, isFetching: false, isLoading: false, refetch: vi.fn(), dataUpdatedAt: Date.now() })
const health = vi.fn()
const saveMutate = vi.fn()
const deleteMutate = vi.fn()
const importMutate = vi.fn()
vi.mock('../../api/hooks', () => ({
  useAdminInsights: () => q({
    generations: { last7d: 12, last30d: 40, avgCourses: 5.5, withoutPreferences: 0.25 },
    topCourses: [{ code: 'CIS 2105', searches: 9 }, { code: 'MATH 101', searches: 4 }],
    preferences: [{ key: 'avoidDays', label: 'Days to avoid', generations: 20, share: 0.5 }],
  }),
  useAdminHealth: () => q(health()),
  useAdminTable: (resource: string) => q(
    resource === 'admins' ? { items: [{ student: '19020241', source: 'Built-in default' }], total: 1, page: 0, size: 15 }
    : resource === 'announcements' ? { items: [
        { admin: '19020241', message: 'ISMIS is down tonight', tone: 'warning', active: true, at: '2026-11-19T10:00:00Z' },
        { admin: '19020241', message: 'ISMIS is down tonight', tone: 'warning', active: false, at: '2026-11-19T18:00:00Z' },
      ], total: 2, page: 0, size: 15 }
    : { items: [{ kind: 'UNAVAILABLE', at: '2026-11-20T01:00:00Z' }], total: 1, page: 0, size: 15 }),
  useAdminAnnouncement: () => q({ message: 'Hello', tone: 'info', active: true, updatedAt: 't' }),
  useSaveAnnouncement: () => ({ mutate: saveMutate, isPending: false, error: null }),
  useDeleteStudent: () => ({ mutate: deleteMutate, isPending: false, error: null }),
  useImportCsv: () => ({ mutate: importMutate, isPending: false, error: null, data: undefined }),
}))

const zero = { AUTH_FAILED: 0, CHALLENGE: 0, LAYOUT_CHANGED: 0, UNAVAILABLE: 0 }
beforeEach(() => { saveMutate.mockReset(); deleteMutate.mockReset(); importMutate.mockReset(); health.mockReturnValue({ status: 'healthy', last24h: zero, last7d: zero, lastFailure: null, lastSuccessfulSearch: null }) })

describe('Usage insights', () => {
  it('shows runs, top courses and preference usage, and says it is anonymous', () => {
    render(<AdminInsightsPage />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('CIS 2105')).toBeInTheDocument()
    expect(screen.getByText('Days to avoid')).toBeInTheDocument()
    expect(screen.getByText(/never include a student ID or name/i)).toBeInTheDocument()
  })
})

describe('ISMIS health', () => {
  it('says healthy, with the recent failures listed', () => {
    render(<AdminHealthPage />)
    expect(screen.getByRole('heading', { name: 'Healthy' })).toBeInTheDocument()
    expect(screen.getAllByText('ISMIS unreachable').length).toBeGreaterThan(0)
  })

  it('says it needs attention when the layout changed', () => {
    health.mockReturnValue({ status: 'broken', last24h: { ...zero, LAYOUT_CHANGED: 2 }, last7d: { ...zero, LAYOUT_CHANGED: 2 }, lastFailure: { kind: 'LAYOUT_CHANGED', at: '2026-11-20T01:00:00Z' }, lastSuccessfulSearch: null })
    render(<AdminHealthPage />)
    expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeInTheDocument()
    expect(screen.getByText(/scraper needs updating/i)).toBeInTheDocument()
  })
})

describe('Announcement', () => {
  it('loads the current message, previews it live, and saves what was typed', async () => {
    const user = userEvent.setup()
    render(<AdminAnnouncementPage />)
    const box = await screen.findByLabelText('Message')
    expect(box).toHaveValue('Hello')
    await user.clear(box)
    await user.type(box, 'Enrollment opens Nov 25')
    expect(screen.getAllByText('Enrollment opens Nov 25').length).toBeGreaterThan(1) // box and preview
    await user.click(screen.getByLabelText('Warning'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(saveMutate).toHaveBeenCalledWith({ message: 'Enrollment opens Nov 25', tone: 'warning', active: true }, expect.anything())
  })
})

describe('Announcement history', () => {
  it('lists every saved announcement with its look, status and author', async () => {
    render(<AdminAnnouncementPage />)
    expect(screen.getByRole('heading', { name: 'Recent announcements' })).toBeInTheDocument()
    expect(screen.getAllByText('ISMIS is down tonight')).toHaveLength(2)
    expect(screen.getByText('Shown')).toBeInTheDocument()
    expect(screen.getByText('Off')).toBeInTheDocument()
    expect(screen.getAllByText('Warning').length).toBeGreaterThan(0)
  })

  it('reuses an old announcement by loading it into the form', async () => {
    window.scrollTo = vi.fn()
    const user = userEvent.setup()
    render(<AdminAnnouncementPage />)
    await user.click(screen.getAllByRole('button', { name: /reuse announcement/i })[0])
    expect(screen.getByLabelText('Message')).toHaveValue('ISMIS is down tonight')
    expect(screen.getByLabelText('Warning')).toBeChecked()
  })
})

describe('Import courses', () => {
  it('needs a student, a year and a file before it will import', async () => {
    const user = userEvent.setup()
    render(<AdminImportPage />)
    const button = screen.getByRole('button', { name: 'Import' })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Student ID number'), '19020241')
    const file = new File(['semester,academic_year\n'], 'courses.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('CSV file'), file)
    expect(button).toBeEnabled()
    await user.click(button)
    const form = importMutate.mock.calls[0][0] as FormData
    expect(form.get('studentIdNumber')).toBe('19020241')
    expect(form.get('semester')).toBe('1ST')
    expect((form.get('file') as File).name).toBe('courses.csv')
  })
})

describe('Admins', () => {
  it('lists the admins and explains how to change them', () => {
    render(<AdminAdminsPage />)
    expect(screen.getByText('19020241')).toBeInTheDocument()
    expect(screen.getByText(/UCHED_ADMIN_IDS/)).toBeInTheDocument()
  })
})

describe('DeleteStudentDialog', () => {
  it('only deletes once the student ID number has been typed exactly', async () => {
    const user = userEvent.setup()
    render(<DeleteStudentDialog student="19020241" onClose={vi.fn()} />)
    const del = screen.getByRole('button', { name: 'Delete everything' })
    expect(del).toBeDisabled()
    await user.type(screen.getByRole('textbox'), '1902024')
    expect(del).toBeDisabled()
    await user.type(screen.getByRole('textbox'), '1')
    expect(del).toBeEnabled()
    await user.click(del)
    expect(deleteMutate).toHaveBeenCalledWith('19020241', expect.anything())
  })
})

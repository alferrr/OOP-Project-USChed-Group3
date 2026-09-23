import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Prospectus } from '../../api/types'
import ProspectusPicker from './ProspectusPicker'

const prospectus: Prospectus = {
  programName: 'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY',
  effectiveYear: '2023',
  courses: [
    { yearLevel: 1, semester: '1ST', code: 'CIS 1101', title: 'PROGRAMMING I', units: 3, requisiteNote: '' },
    { yearLevel: 1, semester: '1ST', code: 'GE-PC', title: 'PURPOSIVE COMMUNICATION', units: 3, requisiteNote: '' },
    { yearLevel: 1, semester: '2ND', code: 'CIS 1102N', title: 'INTRO TO COMPUTING', units: 3, requisiteNote: '' },
    { yearLevel: 1, semester: 'SUMMER', code: 'CIS 2201', title: 'SYSTEMS ANALYSIS', units: 3, requisiteNote: 'PREREQUISITE CIS 1204' },
    { yearLevel: 2, semester: '1ST', code: 'IT ELEC 3', title: 'IT ELECTIVE 3', units: 3, requisiteNote: '3RD YEAR STANDING' },
  ],
}

vi.mock('../../api/hooks', () => ({
  useProspectus: (enabled: boolean) => ({
    data: enabled ? prospectus : undefined,
    isLoading: false,
    error: null,
  }),
}))

function renderPicker(props: Partial<React.ComponentProps<typeof ProspectusPicker>> = {}) {
  const qc = new QueryClient()
  const onAddCodes = vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <ProspectusPicker semester="1ST" codes={[]} onAddCodes={onAddCodes} {...props} />
    </QueryClientProvider>,
  )
  return { onAddCodes }
}

describe('ProspectusPicker', () => {
  it('stays collapsed and fetches nothing until opened', () => {
    renderPicker()
    expect(screen.queryByText(/BACHELOR OF SCIENCE/)).not.toBeInTheDocument()
  })

  it('shows all three terms for a year level, not just the page\'s current term', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByRole('button', { name: /use my prospectus/i }))
    expect(await screen.findByText(/BACHELOR OF SCIENCE/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1st year' }))
    expect(screen.getByText('CIS 1101')).toBeInTheDocument() // defaults to the page's current term, 1ST
    expect(screen.getByRole('button', { name: '1st Semester' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '2nd Semester' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Summer' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Summer' }))
    expect(screen.getByText('CIS 2201')).toBeInTheDocument()
    expect(screen.queryByText('CIS 1101')).not.toBeInTheDocument()
    expect(screen.getByText(/currently searching/i)).toHaveTextContent('1st Semester')
    expect(screen.getByText(/currently searching/i)).toHaveTextContent('Summer')
  })

  it('does not show the term-mismatch note when the picker matches the page\'s term', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByRole('button', { name: /use my prospectus/i }))
    await user.click(await screen.findByRole('button', { name: '1st year' }))
    expect(screen.queryByText(/currently searching/i)).not.toBeInTheDocument()
  })

  it('adds only the new codes, skipping ones already in the search list', async () => {
    const user = userEvent.setup()
    const { onAddCodes } = renderPicker({ codes: ['CIS 1101'] })
    await user.click(screen.getByRole('button', { name: /use my prospectus/i }))
    await user.click(await screen.findByRole('button', { name: '1st year' }))
    const add = screen.getByRole('button', { name: /add 1 to the search list/i })
    await user.click(add)
    expect(onAddCodes).toHaveBeenCalledWith(['CIS 1101', 'GE-PC'])
  })

  it('only shows the terms that year level actually has', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByRole('button', { name: /use my prospectus/i }))
    await user.click(await screen.findByRole('button', { name: '2nd year' }))
    expect(screen.getByRole('button', { name: '1st Semester' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2nd Semester' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Summer' })).not.toBeInTheDocument()
  })
})

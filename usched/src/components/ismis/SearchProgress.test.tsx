import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SearchItem, SearchStatus } from '../../api/types'
import SearchProgress from './SearchProgress'

const item = (query: string, status: SearchItem['status'], extra: Partial<SearchItem> = {}): SearchItem => ({
  query, status, message: '', courses: 0, sections: 0, found: [], suggestions: [], searchedAs: null, ...extra,
})
const job = (status: SearchStatus['status'], items: SearchItem[], error: SearchStatus['error'] = null): SearchStatus =>
  ({ jobId: 'j', status, message: '', items, error })

function renderProgress(status: SearchStatus, opts: { selectedCount?: number; addedCourseIds?: number[] } = {}) {
  const onAddSuggestion = vi.fn()
  render(<SearchProgress status={status} selectedCount={opts.selectedCount ?? 0}
    addedCourseIds={opts.addedCourseIds ?? []} onAddSuggestion={onAddSuggestion} />)
  return { onAddSuggestion }
}

describe('SearchProgress', () => {
  it('shows one row per code with its own state while the job is running', () => {
    renderProgress(job('RUNNING', [
      item('CIS 2105', 'DONE', { courses: 1, sections: 11 }),
      item('MATH 1101', 'RUNNING'),
      item('ENG 1101', 'PENDING'),
    ]))
    expect(screen.getByText('1 course · 11 sections')).toBeInTheDocument()
    expect(screen.getByText('Searching ISMIS…')).toBeInTheDocument()
    expect(screen.getByText('Waiting')).toBeInTheDocument()
  })

  it('explains no-match and too-many-results per code and summarises the selection when done', () => {
    renderProgress(job('DONE', [
      item('nomatch', 'NO_RESULTS', { message: 'ISMIS has no courses matching "nomatch" for this term.' }),
      item('CIS', 'TOO_MANY', { message: '"CIS" matched 12 pages of results.' }),
    ]), { selectedCount: 2 })
    expect(screen.getByText(/no courses matching "nomatch"/)).toBeInTheDocument()
    expect(screen.getByText(/matched 12 pages/)).toBeInTheDocument()
    expect(screen.getByText(/2 courses are in your selection/)).toBeInTheDocument()
  })

  it('shows a plain-language error when the whole job failed', () => {
    renderProgress(job('FAILED', [item('CIS 2105', 'FAILED'), item('MATH 1101', 'SKIPPED')],
      { code: 'ISMIS_SESSION_EXPIRED', message: 'x' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Your ISMIS session ended. Please sign in again.')
  })

  it('offers suggestions for a failed "slot" code, letting the student add one', async () => {
    const user = userEvent.setup()
    const { onAddSuggestion } = renderProgress(job('DONE', [
      item('GE-FEL 2', 'NO_RESULTS', {
        message: 'No exact match for "GE-FEL 2", but ISMIS offers 2 "GE-FEL" courses this term.',
        suggestions: [
          { id: 1, code: 'GE-FEL1', name: 'Free Elective 1', units: 3 },
          { id: 2, code: 'GE-FEL3', name: 'Free Elective 3', units: 3 },
        ],
      }),
    ]))
    expect(screen.getByText('GE-FEL1')).toBeInTheDocument()
    expect(screen.getByText('GE-FEL3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add GE-FEL1' }))
    expect(onAddSuggestion).toHaveBeenCalledWith({ id: 1, code: 'GE-FEL1', name: 'Free Elective 1', units: 3 })
  })

  it('marks an already-selected suggestion as added instead of offering it again', () => {
    renderProgress(job('DONE', [
      item('GE-FEL 2', 'NO_RESULTS', { suggestions: [{ id: 1, code: 'GE-FEL1', name: 'Free Elective 1', units: 3 }] }),
    ]), { addedCourseIds: [1] })
    expect(screen.getByRole('button', { name: 'Add GE-FEL1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add GE-FEL1' })).toHaveTextContent('Added')
  })

  it('shows no suggestions box for a code with none', () => {
    renderProgress(job('DONE', [item('nomatch', 'NO_RESULTS')]))
    expect(screen.queryByRole('button', { name: /^Add /i })).not.toBeInTheDocument()
  })

  it('shows what was actually searched when a known alias rewrote the query', () => {
    renderProgress(job('DONE', [item('GE-FREELEC 2', 'DONE', { searchedAs: 'GE-FEL', courses: 2, sections: 6 })]))
    expect(screen.getByText(/searched as "GE-FEL"/)).toBeInTheDocument()
  })

  it('shows no "searched as" note when nothing was rewritten', () => {
    renderProgress(job('DONE', [item('CIS 2105', 'DONE')]))
    expect(screen.queryByText(/searched as/i)).not.toBeInTheDocument()
  })
})

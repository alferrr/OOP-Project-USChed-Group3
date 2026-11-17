import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Preferences } from '../../api/types'
import PreferencesForm from './PreferencesForm'
import { emptyPreferences } from '../../store/planStore'

function renderForm(value: Preferences = emptyPreferences()) {
  const onChange = vi.fn()
  render(<PreferencesForm value={value} onChange={onChange} />)
  return { onChange }
}

describe('PreferencesForm', () => {
  it('shows "none set" and no Reset button when nothing is configured, collapsed by default', () => {
    renderForm()
    expect(screen.getByText('none set')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Max school days')).not.toBeInTheDocument() // collapsed
  })

  it('counts active settings across both hard and soft prefs, and offers a Reset button once any are set', () => {
    const value: Preferences = {
      hard: { maxSchoolDays: 3, avoidDays: ['SAT'] },
      soft: { minimizeGaps: true, preferMorning: true },
    }
    renderForm(value)
    expect(screen.getByText('4 set')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('resets everything in one click without needing the panel open first', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm({ hard: { maxSchoolDays: 3 }, soft: { minimizeGaps: true } })
    await user.click(screen.getByRole('button', { name: /reset/i }))
    expect(onChange).toHaveBeenCalledWith(emptyPreferences())
  })

  it('expands to reveal the Must follow and Nice to have sections', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    expect(screen.getByText('Must follow')).toBeInTheDocument()
    expect(screen.getByText('Nice to have')).toBeInTheDocument()
    expect(screen.getByText('Max school days')).toBeInTheDocument()
    expect(screen.getByText('A real lunch break')).toBeInTheDocument()
  })

  it('shows a placeholder on every plain number field', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    expect(screen.getByPlaceholderText('e.g. 15')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('No limit')).toHaveLength(2)
  })

  it('updates a hard preference field', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    const input = screen.getByText('Max classes / day').closest('label')!.querySelector('input')!
    await user.type(input, '4')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hard: expect.objectContaining({ maxClassesPerDay: 4 }) }))
  })

  it('toggles an avoid-day pill', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    await user.click(screen.getByText('Sat'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hard: expect.objectContaining({ avoidDays: ['SAT'] }) }))
  })

  it('toggles an avoided instructor and counts it as a setting', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PreferencesForm value={emptyPreferences()} onChange={onChange} instructors={[{ id: 7, name: 'DOE, JANE' }]} />)
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    await user.click(within(screen.getByRole('group', { name: 'Avoid these instructors' })).getByText('DOE, JANE'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hard: expect.objectContaining({ avoidInstructorIds: [7] }) }))
  })

  it('filters instructors by search and keeps chosen ones visible', async () => {
    const user = userEvent.setup()
    const instructors = [{ id: 1, name: 'DOE, JANE' }, { id: 2, name: 'ROE, RICK' }]
    render(<PreferencesForm value={{ hard: {}, soft: { preferredInstructorIds: [2] } }} onChange={vi.fn()} instructors={instructors} />)
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    const avoidGroup = screen.getByRole('group', { name: 'Avoid these instructors' })
    await user.type(within(avoidGroup).getByRole('searchbox'), 'doe')
    expect(within(avoidGroup).getByText('DOE, JANE')).toBeInTheDocument()
    expect(within(avoidGroup).queryByText('ROE, RICK')).not.toBeInTheDocument()
  })

  it('marks an instructor preferred, clearing them from the avoid list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PreferencesForm value={{ hard: { avoidInstructorIds: [1] }, soft: {} }} onChange={onChange} instructors={[{ id: 1, name: 'DOE, JANE' }]} />)
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    await user.click(within(screen.getByRole('group', { name: 'Preferred instructors' })).getByText('DOE, JANE'))
    expect(onChange).toHaveBeenCalledWith({
      hard: expect.objectContaining({ avoidInstructorIds: [] }),
      soft: expect.objectContaining({ preferredInstructorIds: [1] }),
    })
  })

  it('switches time-of-day preference via the scrollable option list', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    await user.click(screen.getByRole('option', { name: 'Morning' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      soft: expect.objectContaining({ preferMorning: true, preferAfternoon: false }),
    }))
  })

  it('picks an earliest-start time from its scrollable list, with "Any time" as the first option', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    const earliestStart = screen.getByRole('listbox', { name: 'Earliest start' })
    expect(within(earliestStart).getAllByRole('option')[0]).toHaveTextContent('Any time')
    await user.click(within(earliestStart).getByRole('option', { name: '7:00 AM' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hard: expect.objectContaining({ earliestStart: '07:00' }) }))
  })

  it('toggles a soft preference checkbox', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()
    await user.click(screen.getByRole('button', { name: /preferences/i }))
    await user.click(screen.getByText('Fewer school days'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ soft: expect.objectContaining({ minimizeDays: true }) }))
  })
})

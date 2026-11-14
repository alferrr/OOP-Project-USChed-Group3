import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import CourseCodesInput from './CourseCodesInput'

function Harness({ initial = [] as string[] }) {
  const [codes, setCodes] = useState(initial)
  return (
    <>
      <CourseCodesInput codes={codes} onChange={setCodes} />
      <output data-testid="codes">{codes.join('|')}</output>
    </>
  )
}
const value = () => screen.getByTestId('codes').textContent

describe('CourseCodesInput', () => {
  it('turns Enter and commas into chips and ignores duplicates', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Course codes')
    await user.type(input, 'CIS 2105{Enter}')
    await user.type(input, 'MATH 1101,')
    await user.type(input, 'cis 2105{Enter}')
    expect(value()).toBe('CIS 2105|MATH 1101')
  })

  it('splits a pasted list', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText('Course codes'))
    await user.paste('CIS 2105, MATH 1101\nENG 1101')
    expect(value()).toBe('CIS 2105|MATH 1101|ENG 1101')
  })

  it('removes a chip with its button and the last chip with Backspace', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['A 1', 'B 2', 'C 3']} />)
    await user.click(screen.getByRole('button', { name: 'Remove B 2' }))
    expect(value()).toBe('A 1|C 3')
    await user.click(screen.getByLabelText('Course codes'))
    await user.keyboard('{Backspace}')
    expect(value()).toBe('A 1')
  })

  it('adds what is typed when the field loses focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Course codes'), 'CIS 2105')
    await user.tab()
    expect(value()).toBe('CIS 2105')
  })

  describe('suggestions', () => {
    const suggestions = [
      { code: 'CIS 2105', name: 'Networking II' },
      { code: 'CIS 2201', name: 'Systems Analysis' },
    ]
    function SuggestHarness({ onQuery }: { onQuery: (t: string) => void }) {
      const [codes, setCodes] = useState<string[]>([])
      return (
        <>
          <CourseCodesInput codes={codes} onChange={setCodes} suggestions={suggestions} onQuery={onQuery} />
          <output data-testid="codes">{codes.join('|')}</output>
        </>
      )
    }

    it('debounces onQuery and ignores text shorter than two characters', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onQuery = vi.fn()
      render(<SuggestHarness onQuery={onQuery} />)
      onQuery.mockClear()
      await user.type(screen.getByLabelText('Course codes'), 'cis')
      expect(onQuery).not.toHaveBeenCalledWith('cis')
      await act(async () => { vi.advanceTimersByTime(350) })
      expect(onQuery).toHaveBeenLastCalledWith('cis')
      expect(onQuery.mock.calls.filter(([t]) => t === 'cis')).toHaveLength(1)
      vi.useRealTimers()
    })

    it('shows suggestions after the pause and adds one on click', async () => {
      const user = userEvent.setup()
      render(<SuggestHarness onQuery={() => {}} />)
      await user.type(screen.getByLabelText('Course codes'), 'cis')
      const option = await screen.findByRole('option', { name: /CIS 2201/ })
      await user.click(option)
      expect(value()).toBe('CIS 2201')
      expect(screen.queryByRole('option', { name: /CIS 2201/ })).not.toBeInTheDocument()
    })

    it('picks the highlighted suggestion with the arrow keys and Enter', async () => {
      const user = userEvent.setup()
      render(<SuggestHarness onQuery={() => {}} />)
      await user.type(screen.getByLabelText('Course codes'), 'cis')
      await screen.findByRole('listbox')
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
      expect(value()).toBe('CIS 2201')
    })

    it('closes the list on Escape', async () => {
      const user = userEvent.setup()
      render(<SuggestHarness onQuery={() => {}} />)
      await user.type(screen.getByLabelText('Course codes'), 'cis')
      await screen.findByRole('listbox')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })
})

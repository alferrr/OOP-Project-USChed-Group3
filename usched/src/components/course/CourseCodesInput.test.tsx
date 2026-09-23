import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
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
})

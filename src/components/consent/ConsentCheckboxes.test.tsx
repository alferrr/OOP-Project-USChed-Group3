import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ConsentCheckboxes from './ConsentCheckboxes'

function Harness() {
  const [v, setV] = useState({ agreedTerms: false, agreedCredentialUse: false })
  return (
    <>
      <ConsentCheckboxes {...v} onChange={setV} />
      <button disabled={!(v.agreedTerms && v.agreedCredentialUse)}>Continue</button>
    </>
  )
}

describe('ConsentCheckboxes', () => {
  it('starts unticked and needs both boxes before Continue enables', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const [terms, creds] = screen.getAllByRole('checkbox')
    expect(terms).not.toBeChecked()
    expect(creds).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    await user.click(terms)
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(creds)
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('reports which box changed', async () => {
    const onChange = vi.fn()
    render(<ConsentCheckboxes agreedTerms={false} agreedCredentialUse={false} onChange={onChange} />)
    await userEvent.setup().click(screen.getAllByRole('checkbox')[1])
    expect(onChange).toHaveBeenCalledWith({ agreedTerms: false, agreedCredentialUse: true })
  })
})

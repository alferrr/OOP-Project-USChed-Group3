import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IsmisSignInPanel from './IsmisSignInPanel'
import { useIsmisStore } from '../../store/ismisStore'

const mutate = vi.fn()
vi.mock('../../api/hooks', () => ({
  useTerms: () => ({ data: { version: '2026-9-2', text: '**USChed Terms of Use.** Section 3: Signing in to ISMIS.' }, isLoading: false, isError: false }),
  useIsmisSignIn: () => ({ mutate, reset: vi.fn(), isPending: false, error: null }),
}))

async function fillAndLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('ISMIS username'), 'student1')
  await user.type(screen.getByLabelText('ISMIS password'), 'hunter2-sentinel')
  await user.click(screen.getByRole('button', { name: 'Log In' }))
}

describe('IsmisSignInPanel', () => {
  beforeEach(() => { mutate.mockClear(); localStorage.clear(); sessionStorage.clear(); useIsmisStore.getState().end() })

  it('shows only the login form until Log In is clicked, and Log In needs both fields', async () => {
    const user = userEvent.setup()
    render(<IsmisSignInPanel />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/USChed Terms of Use/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log In' })).toBeDisabled()
    await user.type(screen.getByLabelText('ISMIS username'), 'student1')
    expect(screen.getByRole('button', { name: 'Log In' })).toBeDisabled()
  })

  it('opens the Terms pop-up after Login and sends nothing until they are accepted', async () => {
    const user = userEvent.setup()
    render(<IsmisSignInPanel />)
    await fillAndLogin(user)

    const dialog = screen.getByRole('dialog', { name: /terms & conditions/i })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/USChed Terms of Use/)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()

    const accept = screen.getByRole('button', { name: 'Accept and sign in' })
    expect(accept).toBeDisabled()
    const [terms, creds] = screen.getAllByRole('checkbox')
    expect(terms).not.toBeChecked()
    expect(creds).not.toBeChecked()
    await user.click(terms)
    expect(accept).toBeDisabled()
    await user.click(creds)
    expect(accept).toBeEnabled()
  })

  it('signs in once on accept, clears the fields, and never stores credentials', async () => {
    const user = userEvent.setup()
    render(<IsmisSignInPanel />)
    await fillAndLogin(user)
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Accept and sign in' }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({ termsVersion: '2026-9-2', username: 'student1', password: 'hunter2-sentinel' })
    expect(screen.getByLabelText('ISMIS username')).toHaveValue('')
    expect(screen.getByLabelText('ISMIS password')).toHaveValue('')
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(stored).not.toContain('hunter2-sentinel')
    expect(stored).not.toContain('student1')
  })

  it('cancelling (button or Escape) sends nothing and clears the password', async () => {
    const user = userEvent.setup()
    render(<IsmisSignInPanel />)
    await fillAndLogin(user)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('ISMIS password')).toHaveValue('')

    await user.type(screen.getByLabelText('ISMIS password'), 'again')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('asks for the Terms again on every login attempt', async () => {
    const user = userEvent.setup()
    render(<IsmisSignInPanel />)
    await fillAndLogin(user)
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.type(screen.getByLabelText('ISMIS password'), 'pw2')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    for (const box of screen.getAllByRole('checkbox')) expect(box).not.toBeChecked()
  })

  it('masks the password, can reveal it with the eye button, and says it is used once', async () => {
    const user = userEvent.setup()
    render(<IsmisSignInPanel />)
    expect(screen.getByText('Student ID or Username')).toBeInTheDocument()
    const password = screen.getByLabelText('ISMIS password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.getByText(/used once to sign in and then discarded/i)).toBeInTheDocument()
  })

  it('tells the student why they were signed out', () => {
    useIsmisStore.getState().end('Your ISMIS session ended. Please sign in again.')
    render(<IsmisSignInPanel />)
    expect(screen.getByRole('status')).toHaveTextContent('Your ISMIS session ended')
  })
})

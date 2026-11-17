import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { safeRedirectTarget } from '../../lib/redirect'
import LoginPage from '../../views/LoginPage'
import { useIsmisStore } from '../../store/ismisStore'
import { nav, router } from '../../test/navigation'
import RequireIsmisSession from './RequireIsmisSession'

vi.mock('../../api/hooks', () => ({
  useTerms: () => ({ data: { version: '2026-9-2', text: 'Terms text here.' }, isLoading: false, isError: false }),
  useIsmisSignIn: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

describe('sign-in gate', () => {
  beforeEach(() => act(() => useIsmisStore.getState().end()))

  it('renders nothing and sends a signed-out visitor to login, remembering where they were going', () => {
    nav.pathname = '/courses'
    render(<RequireIsmisSession><p>COURSES PAGE</p></RequireIsmisSession>)
    expect(screen.queryByText('COURSES PAGE')).not.toBeInTheDocument()
    expect(router.replace).toHaveBeenCalledWith('/login?from=%2Fcourses')
  })

  it('lets a signed-in student through without redirecting', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    nav.pathname = '/schedules'
    render(<RequireIsmisSession><p>SCHEDULES PAGE</p></RequireIsmisSession>)
    expect(screen.getByText('SCHEDULES PAGE')).toBeInTheDocument()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('locks the pages again the moment the session ends', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    nav.pathname = '/courses'
    render(<RequireIsmisSession><p>COURSES PAGE</p></RequireIsmisSession>)
    expect(screen.getByText('COURSES PAGE')).toBeInTheDocument()
    act(() => useIsmisStore.getState().end('Your ISMIS session ended. Please sign in again.'))
    expect(screen.queryByText('COURSES PAGE')).not.toBeInTheDocument()
    expect(router.replace).toHaveBeenCalledWith('/login?from=%2Fcourses')
  })
})

describe('login page', () => {
  beforeEach(() => act(() => useIsmisStore.getState().end()))

  it('shows the welcome and a Log In button; the Terms appear only after Log In is clicked', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /welcome to usched/i })).toBeInTheDocument()
    expect(screen.getByText(/sign in with your ismis account/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument()
    expect(screen.queryByText('Terms text here.')).not.toBeInTheDocument()
  })

  it('shows why the session ended', () => {
    act(() => useIsmisStore.getState().end('Your ISMIS session ended. Please sign in again.'))
    render(<LoginPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Your ISMIS session ended')
  })

  it('bounces a signed-in student back to where they were going', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    nav.search = new URLSearchParams('from=/schedules')
    render(<LoginPage />)
    expect(router.replace).toHaveBeenCalledWith('/schedules')
  })

  it('sends a signed-in student who opened /login directly on to the courses page', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    render(<LoginPage />)
    expect(router.replace).toHaveBeenCalledWith('/courses')
  })
})

describe('safeRedirectTarget', () => {
  it('only ever allows same-site paths', () => {
    expect(safeRedirectTarget('/schedules')).toBe('/schedules')
    expect(safeRedirectTarget(null)).toBe('/courses')
    expect(safeRedirectTarget('https://evil.example')).toBe('/courses')
    expect(safeRedirectTarget('//evil.example')).toBe('/courses')
    expect(safeRedirectTarget('/\\evil.example')).toBe('/courses')
  })
})

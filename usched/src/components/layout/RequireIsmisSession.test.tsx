import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../../pages/LoginPage'
import { useIsmisStore } from '../../store/ismisStore'
import RequireIsmisSession from './RequireIsmisSession'

vi.mock('../../api/hooks', () => ({
  useTerms: () => ({ data: { version: '2026-9-2', text: 'Terms text here.' }, isLoading: false, isError: false }),
  useIsmisSignIn: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

function app(start: string) {
  return (
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireIsmisSession />}>
          <Route path="/courses" element={<p>COURSES PAGE</p>} />
          <Route path="/schedules" element={<p>SCHEDULES PAGE</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('sign-in gate', () => {
  beforeEach(() => act(() => useIsmisStore.getState().end()))

  it('sends a signed-out visitor to the login page; the Terms appear only after Log In is clicked', () => {
    render(app('/courses'))
    expect(screen.queryByText('COURSES PAGE')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /welcome to usched/i })).toBeInTheDocument()
    expect(screen.getByText(/sign in with your ismis account/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument()
    expect(screen.queryByText('Terms text here.')).not.toBeInTheDocument()
  })

  it('lets a signed-in student through, and login bounces them back to where they were going', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    render(app('/schedules'))
    expect(screen.getByText('SCHEDULES PAGE')).toBeInTheDocument()
  })

  it('sends a signed-in student who opens /login on to the courses page', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    render(app('/login'))
    expect(screen.getByText('COURSES PAGE')).toBeInTheDocument()
  })

  it('locks the pages again the moment the session ends', () => {
    act(() => useIsmisStore.getState().setSession('sess', 20))
    render(app('/courses'))
    expect(screen.getByText('COURSES PAGE')).toBeInTheDocument()
    act(() => useIsmisStore.getState().end('Your ISMIS session ended. Please sign in again.'))
    expect(screen.queryByText('COURSES PAGE')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your ISMIS session ended')
  })
})

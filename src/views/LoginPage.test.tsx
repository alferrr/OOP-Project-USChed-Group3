import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

vi.mock('../components/announcement/AnnouncementBanner', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }))
vi.mock('../api/hooks', () => ({
  useTerms: () => ({ data: { version: 'v', text: 't' }, isLoading: false, isError: false }),
  useIsmisSignIn: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

describe('LoginPage', () => {
  it('leads with what the app does and keeps the sign-in form and Terms link', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /plan the term before you enroll/i })).toBeInTheDocument()
    expect(screen.getByLabelText('ISMIS username')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms')
  })

  it('shows the self-assembling timetable as decoration only', () => {
    const { container } = render(<LoginPage />)
    expect(container.querySelector('[aria-hidden="true"] .build-in')).not.toBeNull()
    expect(screen.getByText('0 conflicts')).toBeInTheDocument()
  })
})

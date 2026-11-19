import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIsmisStore } from '../../store/ismisStore'
import AppShell from './AppShell'

vi.mock('next/navigation', () => ({ usePathname: () => '/courses' }))
vi.mock('../../api/hooks', () => ({ useIsmisSignOut: () => ({ mutate: vi.fn(), isPending: false }) }))
vi.mock('../guide/TourGuide', () => ({ default: () => null }))
vi.mock('../chat/ChatPanel', () => ({ default: () => null }))

const signIn = (isAdmin: boolean) => act(() => useIsmisStore.getState().setSession('s', 20, isAdmin))

describe('AppShell header', () => {
  beforeEach(() => act(() => useIsmisStore.getState().end()))

  it('shows the Admin link only to an admin', () => {
    signIn(true)
    render(<AppShell>x</AppShell>)
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })

  it('hides the Admin link from a student who is not an admin', () => {
    signIn(false)
    render(<AppShell>x</AppShell>)
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
  })

  it('hides it when signed out', () => {
    render(<AppShell>x</AppShell>)
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('keeps the header clean: no Help or Tour button (the octopus lives in its own corner)', () => {
    signIn(false)
    render(<AppShell>x</AppShell>)
    expect(screen.queryByRole('button', { name: 'Help' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tour' })).not.toBeInTheDocument()
  })

  it('drops the admin flag as soon as the session ends', () => {
    signIn(true)
    act(() => useIsmisStore.getState().end())
    expect(useIsmisStore.getState().isAdmin).toBe(false)
  })
})

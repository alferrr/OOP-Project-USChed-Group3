import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTourStore } from '../../store/tourStore'
import TourGuide from './TourGuide'

vi.mock('next/navigation', () => ({ usePathname: () => '/courses', useRouter: () => ({ push: vi.fn() }) }))

beforeEach(() => {
  window.localStorage.clear()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  useTourStore.setState({ ready: false, seen: true, active: false, step: 0 })
})

describe('TourGuide', () => {
  it('starts on first visit, steps through and remembers it was finished', async () => {
    render(<TourGuide />)
    expect(await screen.findByRole('dialog', { name: /welcome to usched/i })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /start tour/i }))
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('usched.tour.v1')).toBe('done')
  })

  it('does not start again once seen', () => {
    window.localStorage.setItem('usched.tour.v1', 'done')
    render(<TourGuide />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    render(<TourGuide />)
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

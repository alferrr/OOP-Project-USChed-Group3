import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTourStore } from '../../store/tourStore'

const tourSeen = vi.fn()
const markSeen = vi.fn()
vi.mock('../../api/hooks', () => ({ useTourSeen: () => tourSeen(), useMarkTourSeen: () => ({ mutate: markSeen }) }))
import TourGuide from './TourGuide'

vi.mock('next/navigation', () => ({ usePathname: () => '/courses', useRouter: () => ({ push: vi.fn() }) }))

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  useTourStore.setState({ active: false, step: 0 })
  markSeen.mockClear()
  tourSeen.mockReturnValue({ data: { seen: false } })
})

describe('TourGuide', () => {
  it('starts for an account that has not seen it, steps through and records it on skip', async () => {
    render(<TourGuide />)
    expect(await screen.findByRole('dialog', { name: /welcome to usched/i })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /start tour/i }))
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(markSeen).toHaveBeenCalledTimes(1)
  })

  it('does not start for an account that already saw it', () => {
    tourSeen.mockReturnValue({ data: { seen: true } })
    render(<TourGuide />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('waits for the server before deciding', () => {
    tourSeen.mockReturnValue({ data: undefined })
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

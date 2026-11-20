import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnouncementBanner from './AnnouncementBanner'

const data = vi.fn()
vi.mock('../../api/hooks', () => ({ usePublicAnnouncement: () => ({ data: data() }) }))

beforeEach(() => { sessionStorage.clear(); data.mockReset() })

describe('AnnouncementBanner', () => {
  it('shows nothing when there is no announcement', () => {
    data.mockReturnValue(null)
    const { container } = render(<AnnouncementBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the message, and stays dismissed for the visit', async () => {
    data.mockReturnValue({ message: 'ISMIS is down for maintenance', tone: 'warning', active: true, updatedAt: 't1' })
    const user = userEvent.setup()
    const { unmount } = render(<AnnouncementBanner />)
    expect(screen.getByRole('status')).toHaveTextContent('ISMIS is down for maintenance')
    await user.click(screen.getByRole('button', { name: 'Dismiss announcement' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    unmount()
    render(<AnnouncementBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows again when the admin writes a new message', () => {
    sessionStorage.setItem('usched.announcement.dismissed.t1', '1')
    data.mockReturnValue({ message: 'New news', tone: 'info', active: true, updatedAt: 't2' })
    render(<AnnouncementBanner />)
    expect(screen.getByRole('status')).toHaveTextContent('New news')
  })
})

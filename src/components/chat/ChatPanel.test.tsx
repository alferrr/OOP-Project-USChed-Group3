import { act } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '../../store/chatStore'
import { useTourStore } from '../../store/tourStore'
import ChatPanel from './ChatPanel'

vi.mock('next/navigation', () => ({ usePathname: () => '/courses' }))

const setup = () => userEvent.setup({ delay: null })
/** Lets the octopus finish "typing". */
const finishTyping = () => act(() => { vi.advanceTimersByTime(1500) })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  Element.prototype.scrollTo = vi.fn()
  act(() => { useChatStore.getState().reset(); useChatStore.getState().setOpen(true); useTourStore.getState().stop() })
})
afterEach(() => { vi.useRealTimers() })

describe('ChatPanel: the octopus', () => {
  it('is a floating octopus button when closed, and opens the help window', async () => {
    act(() => useChatStore.getState().setOpen(false))
    const u = setup()
    render(<ChatPanel />)
    expect(screen.queryByRole('region', { name: 'USChed help' })).not.toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Open USChed help' }))
    expect(screen.getByRole('region', { name: 'USChed help' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open USChed help' })).not.toBeInTheDocument()
  })

  it('has no "All topics" list, just the starter questions', () => {
    render(<ChatPanel />)
    expect(screen.queryByText(/all topics/i)).not.toBeInTheDocument()
  })

  it('has no footer disclaimer under the message box', () => {
    render(<ChatPanel />)
    expect(screen.queryByText(/built-in help\. never share/i)).not.toBeInTheDocument()
  })

  it('greets with a real apostrophe, not a raw escape code', () => {
    render(<ChatPanel />)
    expect(screen.getByText(/I’m the USChed octopus/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\\u[0-9a-f]{4}/i)
  })

  it('eases out when closed: the window lingers for its exit animation, then the octopus returns', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.click(screen.getByRole('button', { name: 'Close help' }))
    expect(screen.getByRole('region', { name: 'USChed help' })).toHaveAttribute('data-closing')
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.queryByRole('region', { name: 'USChed help' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open USChed help' })).toBeInTheDocument()
  })

  it('animates each message in from its own side', async () => {
    const u = setup()
    const { container } = render(<ChatPanel />)
    await u.type(screen.getByLabelText('Ask a question'), 'how do i save a schedule{Enter}')
    finishTyping()
    expect(container.querySelector('.msg-right')).not.toBeNull()
    expect(container.querySelector('.msg-left')).not.toBeNull()
  })

  it('types for a moment before answering, then shows the answer with a link', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.type(screen.getByLabelText('Ask a question'), 'how do i generate schedules{Enter}')
    expect(screen.getByText('how do i generate schedules')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /octopus is typing/i })).toBeInTheDocument()
    expect(screen.queryByText(/press "Generate Schedules"/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    finishTyping()
    expect(screen.queryByRole('status', { name: /octopus is typing/i })).not.toBeInTheDocument()
    expect(screen.getByText(/press "Generate Schedules"/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to courses/i })).toHaveAttribute('href', '/courses')
  })

  it('answers a tapped starter question', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.click(screen.getByRole('button', { name: 'What are preferences?' }))
    finishTyping()
    expect(screen.getByText(/"Must follow" rules drop any schedule/)).toBeInTheDocument()
  })

  it('ignores a second question while the octopus is still typing', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.click(screen.getByRole('button', { name: 'What are preferences?' }))
    act(() => useChatStore.getState().send('how do i compare schedules', '/courses'))
    finishTyping()
    expect(useChatStore.getState().messages.filter((m) => m.role === 'user')).toHaveLength(1)
  })

  it('says it is not sure and offers questions to tap for something unrelated', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.type(screen.getByLabelText('Ask a question'), 'who won the game{Enter}')
    finishTyping()
    expect(screen.getByText(/not sure about that one/i)).toBeInTheDocument()
    await u.click(screen.getAllByRole('button', { name: 'How do I save a schedule?' })[0])
    finishTyping()
    expect(screen.getByText(/give it a name/i)).toBeInTheDocument()
  })

  it('replays the tour from the tour button and closes the window', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.click(screen.getAllByRole('button', { name: /replay the tour/i })[0])
    expect(useTourStore.getState().active).toBe(true)
    expect(useChatStore.getState().open).toBe(false)
  })

  it('starting over drops an answer that was still on its way', async () => {
    const u = setup()
    render(<ChatPanel />)
    await u.click(screen.getByRole('button', { name: 'What are preferences?' }))
    act(() => useChatStore.getState().reset())
    finishTyping()
    expect(useChatStore.getState().messages).toEqual([])
    expect(useChatStore.getState().typing).toBe(false)
  })

  it('never sends anything over the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const u = setup()
    render(<ChatPanel />)
    await u.type(screen.getByLabelText('Ask a question'), 'what data do you keep{Enter}')
    finishTyping()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

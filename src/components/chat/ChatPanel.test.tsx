import { act } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '../../store/chatStore'
import { useTourStore } from '../../store/tourStore'
import ChatPanel from './ChatPanel'

vi.mock('next/navigation', () => ({ usePathname: () => '/courses' }))

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
  act(() => { useChatStore.getState().reset(); useChatStore.getState().setOpen(true); useTourStore.getState().stop() })
})

describe('ChatPanel (built-in help)', () => {
  it('stays hidden until opened', () => {
    act(() => useChatStore.getState().setOpen(false))
    render(<ChatPanel />)
    expect(screen.queryByRole('region', { name: 'USChed help' })).not.toBeInTheDocument()
  })

  it('answers a typed question instantly, with a link to the right page', async () => {
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Ask a question'), 'how do i generate schedules{Enter}')
    expect(screen.getByText('how do i generate schedules')).toBeInTheDocument()
    expect(screen.getByText(/press "Generate Schedules"/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to courses/i })).toHaveAttribute('href', '/courses')
  })

  it('answers when a starter question is tapped', async () => {
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.click(screen.getAllByRole('button', { name: 'What are preferences?' })[0])
    expect(screen.getByText(/"Must follow" rules drop any schedule/)).toBeInTheDocument()
  })

  it('says it is not sure and offers questions to tap for something unrelated', async () => {
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Ask a question'), 'who won the game{Enter}')
    expect(screen.getByText(/not sure about that one/i)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'How do I save a schedule?' })[0])
    expect(screen.getByText(/give it a name/i)).toBeInTheDocument()
  })

  it('replays the tour from the tour answer and closes the panel', async () => {
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.click(screen.getAllByRole('button', { name: /replay the tour/i })[0])
    expect(useTourStore.getState().active).toBe(true)
    expect(useChatStore.getState().open).toBe(false)
  })

  it('lists every topic and can start over', async () => {
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.click(screen.getByText(/all topics/i))
    await user.click(screen.getByRole('button', { name: 'Does USChed enroll me?' }))
    expect(screen.getByText(/never enrolls, drops or changes/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(useChatStore.getState().messages).toEqual([])
  })

  it('never sends anything over the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Ask a question'), 'what data do you keep{Enter}')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

import { act } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { useChatStore } from '../../store/chatStore'
import { useTourStore } from '../../store/tourStore'
import ChatPanel from './ChatPanel'

const streamChat = vi.fn()
vi.mock('../../lib/chatClient', () => ({ streamChat: (...a: unknown[]) => streamChat(...a) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/courses' }))

beforeEach(() => {
  streamChat.mockReset()
  Element.prototype.scrollTo = vi.fn()
  act(() => { useChatStore.getState().reset(); useChatStore.getState().setOpen(true); useTourStore.getState().stop() })
})

describe('ChatPanel', () => {
  it('stays hidden until opened', () => {
    act(() => useChatStore.getState().setOpen(false))
    render(<ChatPanel />)
    expect(screen.queryByRole('region', { name: 'USChed assistant' })).not.toBeInTheDocument()
  })

  it('sends a question with the current page and shows the streamed reply', async () => {
    streamChat.mockImplementation(async (_m, _p, onText) => { onText('Open'); onText('Open Preferences.') })
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Message the assistant'), 'How do I avoid a day?{Enter}')
    expect(await screen.findByText('Open Preferences.')).toBeInTheDocument()
    expect(screen.getByText('How do I avoid a day?')).toBeInTheDocument()
    expect(streamChat).toHaveBeenCalledWith([{ role: 'user', content: 'How do I avoid a day?' }], '/courses', expect.any(Function), expect.anything())
  })

  it('sends the whole conversation on a follow-up', async () => {
    streamChat.mockImplementation(async (_m, _p, onText) => onText('Answer'))
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Message the assistant'), 'one{Enter}')
    await screen.findByText('Answer')
    await user.type(screen.getByLabelText('Message the assistant'), 'two{Enter}')
    await vi.waitFor(() => expect(streamChat).toHaveBeenCalledTimes(2))
    expect(streamChat.mock.calls[1][0]).toEqual([
      { role: 'user', content: 'one' }, { role: 'assistant', content: 'Answer' }, { role: 'user', content: 'two' },
    ])
  })

  it('shows a friendly error and keeps the question when the assistant is unavailable', async () => {
    streamChat.mockRejectedValue(new ApiError(503, 'CHAT_UNAVAILABLE', 'The assistant is not available right now.'))
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Message the assistant'), 'hello{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent(/not available right now/i)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('offers suggested questions and replays the tour', async () => {
    streamChat.mockImplementation(async (_m, _p, onText) => onText('Sure.'))
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.click(screen.getByRole('button', { name: 'How do I build a schedule?' }))
    expect(streamChat.mock.calls[0][0][0].content).toBe('How do I build a schedule?')
    act(() => useChatStore.getState().reset())
    act(() => useChatStore.getState().setOpen(true))
    await user.click(screen.getByRole('button', { name: /replay the tour/i }))
    expect(useTourStore.getState().active).toBe(true)
    expect(useChatStore.getState().open).toBe(false)
  })

  it('starts a new chat', async () => {
    streamChat.mockImplementation(async (_m, _p, onText) => onText('Hi'))
    const user = userEvent.setup()
    render(<ChatPanel />)
    await user.type(screen.getByLabelText('Message the assistant'), 'q{Enter}')
    await screen.findByText('Hi')
    await user.click(screen.getByRole('button', { name: 'Start a new chat' }))
    expect(useChatStore.getState().messages).toEqual([])
  })
})

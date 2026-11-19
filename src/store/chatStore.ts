import { create } from 'zustand'
import { ApiError } from '../api/client'
import { errorHelp } from '../lib/errors'
import { streamChat, type ChatMessage } from '../lib/chatClient'

/** Keep what is sent bounded: the server accepts at most this many turns. */
const MAX_SENT = 20
let controller: AbortController | null = null

interface ChatState {
  open: boolean
  messages: ChatMessage[]
  pending: boolean
  error: string | null
  setOpen: (open: boolean) => void
  send: (text: string, page: string | null) => Promise<void>
  stop: () => void
  /** Forget the conversation (new chat, or the student signed out). */
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  messages: [],
  pending: false,
  error: null,
  setOpen: (open) => set({ open }),
  send: async (text, page) => {
    const trimmed = text.trim()
    if (!trimmed || get().pending) return
    const history: ChatMessage[] = [...get().messages, { role: 'user', content: trimmed }]
    // The reply fills in as it streams, so add an empty assistant message to write into.
    set({ messages: [...history, { role: 'assistant', content: '' }], pending: true, error: null })
    controller = new AbortController()
    try {
      await streamChat(history.slice(-MAX_SENT), page, (soFar) => {
        set((s) => ({ messages: [...s.messages.slice(0, -1), { role: 'assistant', content: soFar }] }))
      }, controller.signal)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // Drop the empty reply and say why; the student's question stays so they can retry.
      set((s) => ({
        messages: s.messages[s.messages.length - 1]?.content === '' ? s.messages.slice(0, -1) : s.messages,
        error: e instanceof ApiError ? errorHelp(e.code, e.message) : 'Something went wrong. Please try again.',
      }))
    } finally {
      controller = null
      set({ pending: false })
    }
  },
  stop: () => controller?.abort(),
  reset: () => {
    controller?.abort()
    set({ messages: [], pending: false, error: null, open: false })
  },
}))

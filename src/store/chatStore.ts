import { create } from 'zustand'
import { answerQuestion, type HelpLink } from '../lib/helpBot'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  links?: HelpLink[]
  suggestions?: string[]
  action?: 'tour'
}

interface ChatState {
  open: boolean
  messages: ChatMessage[]
  setOpen: (open: boolean) => void
  /** Adds the student's question and the built-in help's answer (instant: nothing is sent anywhere). */
  send: (text: string, page: string | null) => void
  /** Forget the conversation (new chat, or the student signed out). */
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  messages: [],
  setOpen: (open) => set({ open }),
  send: (text, page) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const reply = answerQuestion(trimmed, page)
    set({
      messages: [
        ...get().messages,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: reply.text, links: reply.links, suggestions: reply.suggestions, action: reply.action },
      ],
    })
  },
  reset: () => set({ messages: [], open: false }),
}))

import { create } from 'zustand'
import { answerQuestion, type HelpLink } from '../lib/helpBot'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  links?: HelpLink[]
  suggestions?: string[]
  action?: 'tour'
}

/** How long the owl "types" before an answer appears: a beat, a little longer for longer answers. */
export function typingDelay(answer: string): number {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0
  const words = answer.split(/\s+/).length
  return Math.min(1400, Math.max(600, 450 + words * 14))
}

/** Bumped by every question and by reset, so an answer that is no longer wanted never lands. */
let turn = 0

interface ChatState {
  open: boolean
  messages: ChatMessage[]
  /** The owl is "typing" an answer. */
  typing: boolean
  setOpen: (open: boolean) => void
  /** Adds the student's question now and the built-in help's answer after a short typing pause (nothing is sent anywhere). */
  send: (text: string, page: string | null) => void
  /** Forget the conversation (start over, or the student signed out). */
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  messages: [],
  typing: false,
  setOpen: (open) => set({ open }),
  send: (text, page) => {
    const trimmed = text.trim()
    if (!trimmed || get().typing) return
    const reply = answerQuestion(trimmed, page)
    const mine = ++turn
    const land = () => {
      if (mine !== turn) return
      set((s) => ({
        typing: false,
        messages: [...s.messages, { role: 'assistant', content: reply.text, links: reply.links, suggestions: reply.suggestions, action: reply.action }],
      }))
    }
    set((s) => ({ messages: [...s.messages, { role: 'user', content: trimmed }], typing: true }))
    const delay = typingDelay(reply.text)
    if (delay === 0) land()
    else setTimeout(land, delay)
  },
  reset: () => {
    turn++
    set({ messages: [], typing: false, open: false })
  },
}))

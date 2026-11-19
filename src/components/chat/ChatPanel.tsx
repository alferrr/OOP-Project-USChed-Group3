'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { RotateCcw, Rocket, Send, Sparkles, Square, X } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useTourStore } from '../../store/tourStore'

const SUGGESTIONS = [
  'How do I build a schedule?',
  'What does “Must follow” mean?',
  'How do I use my prospectus?',
  'How do I avoid a teacher?',
]

/** The assistant's answers are plain text with the odd "-" list, so only line breaks need keeping. */
function Bubble({ role, text, streaming }: { role: 'user' | 'assistant'; text: string; streaming: boolean }) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
        mine ? 'bg-green-700 text-white' : 'bg-green-50 text-green-900'}`}>
        {text || (streaming ? <span className="text-green-900/50">Thinking…</span> : '')}
      </p>
    </div>
  )
}

/** The floating help assistant. Opened from the "Ask" button in the top bar. */
export default function ChatPanel() {
  const { open, messages, pending, error, setOpen, send, stop, reset } = useChatStore()
  const startTour = useTourStore((s) => s.start)
  const pathname = usePathname()
  const [draft, setDraft] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (open) input.current?.focus() }, [open])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [messages, error])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!draft.trim() || pending) return
    void send(draft, pathname)
    setDraft('')
  }

  return (
    <section aria-label="USChed assistant" className="pop fixed bottom-4 right-4 z-[55] flex h-[min(34rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-3xl bg-white shadow-[var(--shadow-lift)] print:hidden">
      <header className="flex items-center gap-2 border-b border-green-100 px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-gold-100 text-gold-700" aria-hidden><Sparkles size={16} /></span>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-green-900">USChed assistant</h2>
          <p className="text-xs text-green-900/60">AI help with using USChed</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={reset} aria-label="Start a new chat" title="New chat" className="rounded-full p-2 text-green-700 hover:bg-green-100">
            <RotateCcw size={16} aria-hidden />
          </button>
        )}
        <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-full p-2 text-green-700 hover:bg-green-100">
          <X size={18} aria-hidden />
        </button>
      </header>

      <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div>
            <p className="text-sm text-green-900/80">Hi! Ask me anything about using USChed: finding courses, preferences, saving schedules and more.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => void send(q, pathname)}
                  className="rounded-full bg-green-50 px-3 py-1.5 text-left text-sm font-medium text-green-900 hover:bg-green-100">{q}</button>
              ))}
              <button type="button" onClick={() => { setOpen(false); startTour() }}
                className="flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-gold-300">
                <Rocket size={14} aria-hidden /> Replay the tour
              </button>
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} streaming={pending && i === messages.length - 1} />)
        )}
        {error && <p role="alert" className="alert-error">{error}</p>}
      </div>

      <form onSubmit={submit} className="border-t border-green-100 p-3">
        <div className="flex items-end gap-2">
          <textarea ref={input} value={draft} rows={1} maxLength={1000} aria-label="Message the assistant" placeholder="Ask a question…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }}
            className="control max-h-28 min-h-11 flex-1 resize-none py-2.5" />
          {pending ? (
            <button type="button" onClick={stop} aria-label="Stop" className="btn btn-quiet size-11 shrink-0 p-0"><Square size={16} aria-hidden /></button>
          ) : (
            <button type="submit" disabled={!draft.trim()} aria-label="Send" className="btn btn-primary size-11 shrink-0 p-0"><Send size={16} aria-hidden /></button>
          )}
        </div>
        <p className="mt-2 text-xs text-green-900/55">AI can be wrong, so check details in ISMIS. Never share your password here.</p>
      </form>
    </section>
  )
}

'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleHelp, RotateCcw, Rocket, Send, X } from 'lucide-react'
import { ENTRIES } from '../../lib/helpBot'
import { useChatStore, type ChatMessage } from '../../store/chatStore'
import { useTourStore } from '../../store/tourStore'

const STARTERS = ['How do I generate schedules?', 'What are preferences?', 'How do I use my prospectus?', 'How do I avoid or prefer a teacher?', 'Where are my saved schedules?']

function Bubble({ message, onAsk, onTour, latest }: { message: ChatMessage; onAsk: (q: string) => void; onTour: () => void; latest: boolean }) {
  if (message.role === 'user') {
    return <div className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-green-700 px-3.5 py-2 text-sm text-white">{message.content}</p></div>
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl bg-green-50 px-3.5 py-2 text-sm text-green-900">{message.content}</p>
      {(message.links?.length || message.action) && (
        <div className="flex flex-wrap gap-2">
          {message.links?.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full bg-gold-100 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-gold-300">{l.label} →</Link>
          ))}
          {message.action === 'tour' && (
            <button type="button" onClick={onTour} className="flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-gold-300">
              <Rocket size={14} aria-hidden /> Replay the tour
            </button>
          )}
        </div>
      )}
      {latest && message.suggestions && (
        <div className="flex flex-wrap gap-2">
          {message.suggestions.map((q) => (
            <button key={q} type="button" onClick={() => onAsk(q)} className="rounded-full bg-white px-3 py-1.5 text-left text-sm font-medium text-green-900 ring-1 ring-green-200 hover:bg-green-50">{q}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** The floating help window, opened from "Help" in the top bar. Answers come from USChed's built-in help list. */
export default function ChatPanel() {
  const { open, messages, setOpen, send, reset } = useChatStore()
  const startTour = useTourStore((s) => s.start)
  const pathname = usePathname()
  const [draft, setDraft] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) input.current?.focus() }, [open])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [messages])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const ask = (q: string) => send(q, pathname)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    ask(draft)
    setDraft('')
  }
  const tour = () => { setOpen(false); startTour() }

  return (
    <section aria-label="USChed help" className="pop fixed bottom-4 right-4 z-[55] flex h-[min(34rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-3xl bg-white shadow-[var(--shadow-lift)] print:hidden">
      <header className="flex items-center gap-2 border-b border-green-100 px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-gold-100 text-gold-700" aria-hidden><CircleHelp size={16} /></span>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-green-900">USChed help</h2>
          <p className="text-xs text-green-900/60">Quick answers about using USChed</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={reset} aria-label="Start over" title="Start over" className="rounded-full p-2 text-green-700 hover:bg-green-100"><RotateCcw size={16} aria-hidden /></button>
        )}
        <button type="button" onClick={() => setOpen(false)} aria-label="Close help" className="rounded-full p-2 text-green-700 hover:bg-green-100"><X size={18} aria-hidden /></button>
      </header>

      <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div>
            <p className="text-sm text-green-900/80">Hi! Ask me how anything in USChed works, or tap a question.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((q) => (
                <button key={q} type="button" onClick={() => ask(q)} className="rounded-full bg-green-50 px-3 py-1.5 text-left text-sm font-medium text-green-900 hover:bg-green-100">{q}</button>
              ))}
              <button type="button" onClick={tour} className="flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-gold-300">
                <Rocket size={14} aria-hidden /> Replay the tour
              </button>
            </div>
            <details className="mt-4 text-sm text-green-900/70">
              <summary className="cursor-pointer font-semibold text-green-900">All topics ({ENTRIES.length})</summary>
              <ul className="mt-2 space-y-1">
                {ENTRIES.map((e) => (
                  <li key={e.id}><button type="button" onClick={() => ask(e.question)} className="text-left underline-offset-2 hover:underline">{e.question}</button></li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} message={m} onAsk={ask} onTour={tour} latest={i === messages.length - 1} />)
        )}
      </div>

      <form onSubmit={submit} className="border-t border-green-100 p-3">
        <div className="flex items-center gap-2">
          <input ref={input} value={draft} maxLength={200} aria-label="Ask a question" placeholder="Ask a question…" autoComplete="off"
            onChange={(e) => setDraft(e.target.value)} className="control flex-1" />
          <button type="submit" disabled={!draft.trim()} aria-label="Send" className="btn btn-primary size-11 shrink-0 p-0"><Send size={16} aria-hidden /></button>
        </div>
        <p className="mt-2 text-xs text-green-900/55">Answers come from USChed&apos;s built-in help. Never share your password here.</p>
      </form>
    </section>
  )
}

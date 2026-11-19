'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RotateCcw, Rocket, Send, X } from 'lucide-react'
import { ENTRIES } from '../../lib/helpBot'
import { useChatStore, type ChatMessage } from '../../store/chatStore'
import Octopus from './Octopus'
import { useTourStore } from '../../store/tourStore'

const STARTERS = ['How do I generate schedules?', 'What are preferences?', 'How do I use my prospectus?', 'How do I avoid or prefer a teacher?', 'Where are my saved schedules?']

function Typing() {
  return (
    <div className="msg-left flex items-end gap-2" role="status" aria-label="The octopus is typing">
      <span className="size-7 shrink-0 rounded-full bg-gold-100 p-0.5"><Octopus /></span>
      <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-green-50 px-4 py-3" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} style={{ ['--i' as string]: i }} className="typing-dot size-1.5 rounded-full bg-green-700" />)}
      </span>
    </div>
  )
}

function Bubble({ message, onAsk, onTour, latest }: { message: ChatMessage; onAsk: (q: string) => void; onTour: () => void; latest: boolean }) {
  if (message.role === 'user') {
    return <div className="msg-right flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-green-700 px-3.5 py-2 text-sm text-white">{message.content}</p></div>
  }
  return (
    <div className="msg-left flex flex-col items-start gap-2">
      <div className="flex items-end gap-2">
        <span className="size-7 shrink-0 rounded-full bg-gold-100 p-0.5"><Octopus /></span>
        <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-green-50 px-3.5 py-2 text-sm text-green-900">{message.content}</p>
      </div>
      {(message.links?.length || message.action) && (
        <div className="flex flex-wrap gap-2">
          {message.links?.map((l, i) => (
            <Link key={l.href} href={l.href} style={{ ['--i' as string]: i }} className="chip-in rounded-full bg-gold-100 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-gold-300">{l.label} →</Link>
          ))}
          {message.action === 'tour' && (
            <button type="button" onClick={onTour} style={{ ['--i' as string]: message.links?.length ?? 0 }} className="chip-in flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-gold-300">
              <Rocket size={14} aria-hidden /> Replay the tour
            </button>
          )}
        </div>
      )}
      {latest && message.suggestions && (
        <div className="flex flex-wrap gap-2">
          {message.suggestions.map((q, i) => (
            <button key={q} type="button" onClick={() => onAsk(q)} style={{ ['--i' as string]: i }} className="chip-in rounded-full bg-white px-3 py-1.5 text-left text-sm font-medium text-green-900 ring-1 ring-green-200 hover:bg-green-50">{q}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** The floating help window, opened from "Help" in the top bar. Answers come from USChed's built-in help list. */
export default function ChatPanel() {
  const { open, messages, typing, setOpen, send, reset } = useChatStore()
  const startTour = useTourStore((s) => s.start)
  const pathname = usePathname()
  const [draft, setDraft] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  // The window stays mounted for its exit animation after `open` turns false.
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), 200)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => { if (open) input.current?.focus() }, [open])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }) }, [messages, typing])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open && !mounted) {
    // Closed: just the octopus, parked in the corner.
    return (
      <button type="button" onClick={() => setOpen(true)} aria-label="Open USChed help" title="Need a hand? Ask the octopus. I have eight!"
        className="octopus-blob fixed bottom-5 right-5 z-[54] grid size-[4.5rem] place-items-center bg-gold-400 shadow-[var(--shadow-lift)] transition-transform duration-200 hover:scale-110 active:scale-95 print:hidden"
        style={{ borderRadius: '58% 42% 55% 45% / 52% 58% 42% 48%' }}>
        <span className="size-14"><Octopus /></span>
      </button>
    )
  }

  const ask = (q: string) => send(q, pathname)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    ask(draft)
    setDraft('')
  }
  const tour = () => { setOpen(false); startTour() }

  return (
    <section aria-label="USChed help" data-closing={!open || undefined} className="dock fixed bottom-4 right-4 z-[55] flex h-[min(34rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-3xl bg-white shadow-[var(--shadow-lift)] print:hidden">
      <header className="flex items-center gap-2 border-b border-green-100 px-4 py-3">
        <span className="size-9 rounded-full bg-gold-100 p-0.5"><Octopus /></span>
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-green-900">USChed help</h2>
          <p className="text-xs text-green-900/60">The octopus knows how USChed works</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={reset} aria-label="Start over" title="Start over" className="rounded-full p-2 text-green-700 hover:bg-green-100"><RotateCcw size={16} aria-hidden /></button>
        )}
        <button type="button" onClick={() => setOpen(false)} aria-label="Close help" className="rounded-full p-2 text-green-700 hover:bg-green-100"><X size={18} aria-hidden /></button>
      </header>

      <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="msg-left">
            <p className="text-sm text-green-900/80">Ink-redible to meet you! I\u2019m the USChed octopus. Ask me how anything works, or tap a question.</p>
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
          messages.map((m, i) => <Bubble key={i} message={m} onAsk={ask} onTour={tour} latest={i === messages.length - 1 && !typing} />)
        )}
        {typing && <Typing />}
      </div>

      <form onSubmit={submit} className="border-t border-green-100 p-3">
        <div className="flex items-center gap-2">
          <input ref={input} value={draft} maxLength={200} aria-label="Ask a question" placeholder="Ask a question…" autoComplete="off"
            onChange={(e) => setDraft(e.target.value)} className="control flex-1" />
          <button type="submit" disabled={!draft.trim() || typing} aria-label="Send" className="btn btn-primary size-11 shrink-0 p-0"><Send size={16} aria-hidden /></button>
        </div>
        <p className="mt-2 text-xs text-green-900/55">Answers come from USChed&apos;s built-in help. Never share your password here.</p>
      </form>
    </section>
  )
}

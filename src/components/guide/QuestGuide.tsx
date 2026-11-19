'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Lock, Rocket, Sparkles, Trophy, X } from 'lucide-react'
import { useGuideStore } from '../../store/guideStore'
import { usePreferencesStore, useSavedStore, useScheduleStore, useSelectionStore } from '../../store/planStore'
import { QUEST_STEPS, questProgress, TOTAL_XP, type QuestContext } from '../../lib/quest'

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.08,
  hue: ['#f0c53d', '#0f6b3f', '#2f7d4f', '#f5d86a', '#a6c7b2'][i % 5],
  drift: ((i * 53) % 60) - 30,
}))

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {CONFETTI.map((c, i) => (
        <span key={i} className="confetti" style={{ left: `${c.left}%`, background: c.hue, animationDelay: `${c.delay}s`, ['--drift' as string]: `${c.drift}vw` }} />
      ))}
    </div>
  )
}

/**
 * A first-sign-in guide dressed as a small game: a welcome, five quests that tick themselves off as the student
 * really does them, XP, a rank title and a celebration at the end. It only reads counts from the stores.
 */
export default function QuestGuide() {
  const { status, open, done, toast, hydrate, start, hide, setOpen, complete, clearToast, finish } = useGuideStore()
  const selectedCourses = useSelectionStore((s) => s.selected.length)
  const preferences = usePreferencesStore((s) => s.preferences)
  const generated = useScheduleStore((s) => s.result !== null)
  const comparing = useScheduleStore((s) => s.compareRanks.length)
  const savedSchedules = useSavedStore((s) => s.saved.length)

  useEffect(() => { hydrate() }, [hydrate])

  // Tick quests off as the student actually does them (only while the guide is running).
  useEffect(() => {
    if (status !== 'active') return
    const ctx: QuestContext = { selectedCourses, preferences, generated, savedSchedules, comparing }
    for (const s of QUEST_STEPS) if (s.isDone(ctx)) complete(s.id, s.title, s.xp)
  }, [status, selectedCourses, preferences, generated, savedSchedules, comparing, complete])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3200)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  const progress = useMemo(() => questProgress(new Set(done)), [done])
  // When the last quest lands, pop the panel open so the celebration is seen.
  useEffect(() => { if (status === 'active' && progress.finished) setOpen(true) }, [status, progress.finished, setOpen])

  if (status === 'new') {
    return (
      <div className="backdrop fixed inset-0 z-[60] flex items-center justify-center bg-green-900/50 p-4 backdrop-blur-sm print:hidden">
        <div role="dialog" aria-modal="true" aria-labelledby="quest-welcome" className="pop w-full max-w-md rounded-[2rem] bg-white p-7 text-center shadow-[var(--shadow-lift)]">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold-100 text-gold-700"><Rocket size={30} aria-hidden /></span>
          <h2 id="quest-welcome" className="mt-4 text-2xl font-extrabold text-green-900">Welcome to USChed!</h2>
          <p className="mt-2 text-green-900/70">
            Ready to build your first schedule? Finish {QUEST_STEPS.length} quick quests, earn {TOTAL_XP} XP and rank up from Freshman to Dean’s Lister.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={start} className="btn btn-gold">Start the quest</button>
            <button type="button" onClick={hide} className="btn btn-quiet">Skip for now</button>
          </div>
        </div>
      </div>
    )
  }

  if (status !== 'active') return null

  const { steps, current, xp, percent, level, finished, completed } = progress

  return (
    <div className="print:hidden">
      {finished && open && <Confetti />}
      {toast && (
        <div role="status" className="rise fixed bottom-24 left-1/2 z-[65] -translate-x-1/2 rounded-full bg-green-800 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-lift)]">
          <span className="text-gold-300">+{toast.xp} XP</span> · {toast.title}
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[55] flex flex-col items-end gap-3">
        {open && (
          <section aria-label="Getting started quests" className="pop w-[min(22rem,calc(100vw-2rem))] rounded-3xl bg-white shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-700">{finished ? 'All quests complete' : `Quest ${Math.min(completed + 1, steps.length)} of ${steps.length}`}</p>
                <h2 className="text-lg font-extrabold text-green-900">{level}</h2>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setOpen(false)} aria-label="Collapse guide" className="rounded-full p-1.5 text-green-700 hover:bg-green-100"><ChevronDown size={18} aria-hidden /></button>
                <button type="button" onClick={hide} aria-label="Hide guide" className="rounded-full p-1.5 text-green-700 hover:bg-green-100"><X size={18} aria-hidden /></button>
              </div>
            </div>

            <div className="px-5">
              <div className="flex justify-between text-xs font-semibold text-green-900/70"><span>{xp} XP</span><span>{TOTAL_XP} XP</span></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-green-100" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL_XP} aria-valuenow={xp} aria-label="Quest progress">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-[width] duration-700" style={{ width: `${percent}%` }} />
              </div>
            </div>

            {finished ? (
              <div className="px-5 pb-5 pt-4 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold-100 text-gold-700"><Trophy size={26} aria-hidden /></span>
                <p className="mt-3 font-bold text-green-900">You’re a Dean’s Lister!</p>
                <p className="mt-1 text-sm text-green-900/70">You know your way around USChed. Remember to enroll in the official ISMIS.</p>
                <button type="button" onClick={finish} className="btn btn-gold mt-4 w-full">Finish</button>
              </div>
            ) : (
              <ol className="space-y-1.5 px-3 pb-4 pt-3">
                {steps.map((s) => {
                  const isCurrent = current?.id === s.id
                  return (
                    <li key={s.id} aria-current={isCurrent ? 'step' : undefined}
                      className={`rounded-2xl px-3 py-2.5 ${isCurrent ? 'bg-gold-50 ring-2 ring-gold-300' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          s.done ? 'bg-green-700 text-white' : isCurrent ? 'bg-gold-400 text-green-900' : 'bg-green-100 text-green-900/50'}`}>
                          {s.done ? <Check size={14} aria-hidden /> : isCurrent ? <Sparkles size={13} aria-hidden /> : <Lock size={12} aria-hidden />}
                        </span>
                        <span className={`flex-1 text-sm font-semibold ${s.done ? 'text-green-900/50 line-through' : 'text-green-900'}`}>{s.title}</span>
                        <span className={`text-xs font-bold ${s.done ? 'text-green-700' : 'text-green-900/50'}`}>+{s.xp}</span>
                      </div>
                      {isCurrent && (
                        <div className="ml-10 mt-1.5">
                          <p className="text-sm text-green-900/70">{s.hint}</p>
                          <Link href={s.href} className="mt-1.5 inline-block text-sm font-bold text-green-700 underline-offset-2 hover:underline">Take me there →</Link>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )}

        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Quest guide, ${xp} of ${TOTAL_XP} XP`}
          className="relative flex size-14 items-center justify-center rounded-full bg-white shadow-[var(--shadow-lift)] transition-transform hover:scale-105 active:scale-95"
          style={{ background: `conic-gradient(var(--color-gold-400) ${percent * 3.6}deg, var(--color-green-100) 0)` }}>
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-green-800"><Trophy size={20} aria-hidden /></span>
        </button>
      </div>
    </div>
  )
}

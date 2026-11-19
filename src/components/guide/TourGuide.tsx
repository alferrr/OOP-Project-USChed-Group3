'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMarkTourSeen, useTourSeen } from '../../api/hooks'
import { tourSteps } from '../../lib/tour'
import { useTourStore } from '../../store/tourStore'

interface Box { top: number; left: number; width: number; height: number }

const PAD = 8
const CARD_W = 336

function measure(target: string | undefined): Box | null {
  if (!target) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

/** A step-by-step product tour: dims the page, highlights one real element at a time and explains it. */
export default function TourGuide() {
  const { active, step, regular, start, next, back, stop, setRegular } = useTourStore()
  const tourSeen = useTourSeen()
  const markSeen = useMarkTourSeen()
  const finish = useCallback(() => { stop(); markSeen.mutate() }, [stop, markSeen])
  // Offer the tour once per sign-in, and only if this account has not finished or skipped it before.
  const offered = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  const [box, setBox] = useState<Box | null>(null)
  const [vh, setVh] = useState(0)
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tourSeen.data && !tourSeen.data.seen && !offered.current) {
      offered.current = true
      start()
    }
  }, [tourSeen.data, start])

  const steps = tourSteps(regular)
  const current = steps[Math.min(step, steps.length - 1)]
  const total = steps.length
  const last = step >= total - 1

  // The page-specific steps need their page; take the student there.
  useEffect(() => {
    if (active && current.page && pathname !== current.page) router.push(current.page)
  }, [active, current.page, pathname, router])

  const place = useCallback(() => {
    setVh(window.innerHeight)
    setBox(measure(current.target))
  }, [current.target])

  useLayoutEffect(() => {
    if (!active) return
    const el = current.target ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`) : null
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    place()
    // The element may mount a moment later (page change) or move while smooth-scrolling.
    const ticks = [100, 350, 700].map((ms) => setTimeout(place, ms))
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      ticks.forEach(clearTimeout)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [active, step, current.target, pathname, place])

  useEffect(() => {
    if (!active) return
    card.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') (last ? finish : next)()
      else if (e.key === 'ArrowLeft') back()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, step, last, finish, next, back])

  if (!active) return null

  // Card placement: below the highlight if it fits, else above; centered when there is nothing to point at
  // and pinned to the bottom on phones.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  let style: React.CSSProperties
  if (!box || narrow) {
    style = narrow ? { left: 16, right: 16, bottom: 16, width: 'auto' } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  } else {
    const below = box.top + box.height + 16
    const fitsBelow = below + 220 < vh
    const left = Math.min(Math.max(16, box.left), window.innerWidth - CARD_W - 16)
    style = fitsBelow ? { top: below, left } : { top: Math.max(16, box.top - 16), left, transform: 'translateY(-100%)' }
  }

  return (
    <div className="print:hidden">
      {/* The spotlight: a transparent box whose huge shadow dims everything else. With no target, plain dimming. */}
      {box ? (
        <div aria-hidden className="pointer-events-none fixed z-[60] rounded-2xl transition-all duration-300 motion-reduce:transition-none"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: '0 0 0 9999px rgb(10 47 29 / 0.55), 0 0 0 3px var(--color-gold-400)' }} />
      ) : (
        <div aria-hidden className="fixed inset-0 z-[60] bg-green-900/55" />
      )}
      {/* Blocks clicks on the page while the tour is open. */}
      <div aria-hidden className="fixed inset-0 z-[61]" />
      <div ref={card} role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex={-1}
        className="fixed z-[62] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-5 shadow-[var(--shadow-lift)] outline-none"
        style={{ width: CARD_W, ...style }}>
        <p className="text-xs font-bold uppercase tracking-wide text-green-700">Step {step + 1} of {total}</p>
        <h2 id="tour-title" className="mt-1 text-lg font-extrabold text-green-900">{current.title}</h2>
        <p className="mt-1.5 text-sm text-green-900/80">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-hidden>
            {steps.map((s, i) => <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-green-700' : 'w-1.5 bg-green-200'}`} />)}
          </div>
          {!last && <button type="button" onClick={finish} className="rounded-full px-3 py-1.5 text-sm font-semibold text-green-900/60 hover:text-green-900">Skip tour</button>}
        </div>
        <div className="mt-3 flex gap-2">
          {current.asksRegular ? (
            <>
              <button type="button" onClick={() => { setRegular(false); next() }} className="btn btn-quiet flex-1 px-4 py-2 text-sm">Not regular</button>
              <button type="button" onClick={() => { setRegular(true); next() }} className="btn btn-primary flex-1 px-4 py-2 text-sm">Yes, regular</button>
            </>
          ) : (
            <>
              {step > 0 && <button type="button" onClick={back} className="btn btn-quiet flex-1 px-4 py-2 text-sm">Back</button>}
              <button type="button" onClick={last ? finish : next} className="btn btn-primary flex-1 px-4 py-2 text-sm">{last ? 'Done' : 'Next'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

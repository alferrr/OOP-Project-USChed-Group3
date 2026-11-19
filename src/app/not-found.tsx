import type { Metadata } from 'next'
import Link from 'next/link'
import { COURSE_COLORS } from '../lib/days'

export const metadata: Metadata = { title: 'Page not found' }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = ['8', '9', '10', '11', '12', '1', '2', '3']

// Real-looking classes on the timetable. col/row/rows are grid cells (6 days x 8 hours); each one sits where the
// lost block lands at one of its five stops, so it clashes there. The last two are just company.
const CLASSES = [
  { code: 'CIS 2105', col: 0, row: 2, rows: 2, color: 0, clash: 0 },
  { code: 'ENG 101', col: 2, row: 2, rows: 2, color: 1, clash: 1 },
  { code: 'PE 1', col: 4, row: 1, rows: 2, color: 2, clash: 2 },
  { code: 'MATH 101', col: 1, row: 4, rows: 2, color: 4, clash: 3 },
  { code: 'NSTP 1', col: 3, row: 3, rows: 2, color: 3, clash: 4 },
  { code: 'FIL 101', col: 5, row: 4, rows: 2, color: 5 },
  { code: 'HIST 1', col: 2, row: 6, rows: 2, color: 0 },
]

const SAYS = [
  'Mon 9:00 – clashes with CIS 2105',
  'Wed 11:00 – clashes with ENG 101',
  'Fri 8:00 – clashes with PE 1',
  'Tue 1:00 – clashes with MATH 101',
  'Thu 10:00 – clashes with NSTP 1',
]

/**
 * A 404 in USChed's own language: a timetable, and a class block that cannot find a slot. Every address that is
 * not a page is a section that is not offered this semester.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8">
      <Link href="/courses" className="font-display text-xl font-extrabold tracking-tight text-green-800">
        US<span className="text-green-500">Ched</span>
      </Link>

      <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-gold-700">Error 404 · Section not found</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-green-900 sm:text-6xl">
            This page isn’t on your&nbsp;schedule.
          </h1>
          <p className="mt-5 max-w-md text-lg text-green-900/75">
            No section matches that address. It may have been dropped, moved to another room, or never offered this semester.
          </p>

          <dl className="mt-7 grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 border-y border-green-200 py-4 text-sm">
            <div><dt className="text-green-900/55">Room</dt><dd className="font-semibold text-green-900">404</dd></div>
            <div><dt className="text-green-900/55">Instructor</dt><dd className="font-semibold text-green-900">TBA</dd></div>
            <div><dt className="text-green-900/55">Units</dt><dd className="font-semibold text-green-900">0</dd></div>
            <div><dt className="text-green-900/55">Slots</dt><dd className="font-semibold text-green-900">0 / 0</dd></div>
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/courses" className="btn btn-primary">Back to your courses</Link>
            <Link href="/terms" className="btn btn-quiet">Read the Terms</Link>
          </div>
        </div>

        <div aria-hidden>
          <div className="grid grid-cols-[2rem_1fr] gap-x-2 sm:grid-cols-[2.5rem_1fr]">
            <span />
            <div className="grid grid-cols-6 pb-2 text-center text-xs font-semibold text-green-900/60">
              {DAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-rows-8 text-right text-xs text-green-900/50">
              {HOURS.map((h) => <span key={h} className="-translate-y-1.5">{h}</span>)}
            </div>
            <div className="relative aspect-[6/7] overflow-hidden rounded-xl border border-green-200 bg-white"
              style={{
                backgroundImage:
                  'linear-gradient(to right, var(--color-green-100) 1px, transparent 1px), linear-gradient(to bottom, var(--color-green-100) 1px, transparent 1px)',
                backgroundSize: 'calc(100% / 6) calc(100% / 8)',
              }}>
              {CLASSES.map((c) => {
                const col = COURSE_COLORS[c.color]
                return (
                  <span key={c.code}
                    className={`absolute flex items-start rounded-md p-1.5 text-[0.65rem] font-semibold leading-tight sm:text-xs ${c.clash !== undefined ? 'lost-clash' : ''}`}
                    style={{
                      ['--i' as string]: c.clash ?? 0,
                      left: `calc(${c.col} * 100% / 6 + 2px)`, width: 'calc(100% / 6 - 4px)',
                      top: `calc(${c.row} * 100% / 8 + 2px)`, height: `calc(${c.rows} * 100% / 8 - 4px)`,
                      background: col.bg, color: col.text, borderLeft: `3px solid ${col.border}`,
                    }}>
                    {c.code}
                  </span>
                )
              })}
              <span className="absolute left-0 top-0 h-1/4 w-1/6 p-0.5">
                <span className="lost-block flex h-full w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-gold-500 bg-gold-50/95 text-center text-green-900 shadow-sm">
                  <span className="text-lg font-extrabold leading-none sm:text-2xl">404</span>
                  <span className="mt-0.5 text-[0.55rem] leading-tight sm:text-[0.65rem]">no section</span>
                </span>
              </span>
            </div>
          </div>
          <p className="relative mt-3 h-5 pl-[2.5rem] text-xs font-semibold text-red-700 sm:text-sm">
            {SAYS.map((s, i) => <span key={s} style={{ ['--i' as string]: i }} className="lost-say absolute left-[2.5rem] top-0">{s}</span>)}
          </p>
        </div>
      </div>
    </main>
  )
}

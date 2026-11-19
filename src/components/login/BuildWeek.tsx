import { Check } from 'lucide-react'
import { COURSE_COLORS } from '../../lib/days'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = ['8', '9', '10', '11', '12', '1', '2', '3']

// A realistic week with no clashes. Each class has its own meetings (col = day, row = hour, rows = length) and
// drops in on its own beat, so the grid assembles itself.
const CLASSES = [
  { code: 'CIS 2105', color: 0, says: 'Placed CIS 2105 · Mon & Thu 8:00', meets: [[0, 0, 2], [3, 0, 2]] },
  { code: 'ENG 101', color: 1, says: 'Placed ENG 101 · Tue & Fri 9:00', meets: [[1, 1, 2], [4, 1, 2]] },
  { code: 'MATH 101', color: 2, says: 'Placed MATH 101 · Mon, Wed & Fri 11:00', meets: [[0, 3, 1], [2, 3, 1], [4, 3, 1]] },
  { code: 'PE 1', color: 3, says: 'Placed PE 1 · Sat 8:00', meets: [[5, 0, 2]] },
  { code: 'HIST 1', color: 4, says: 'Placed HIST 1 · Tue & Thu 12:00', meets: [[1, 4, 2], [3, 4, 2]] },
  { code: 'NSTP 1', color: 5, says: 'Placed NSTP 1 · Sat 11:00', meets: [[5, 3, 3]] },
]

/**
 * The login page's artwork: a weekly timetable that fills itself in, one class at a time, with no clashes — the
 * promise of the app, shown rather than told. Decorative; the page's text carries the meaning.
 */
export default function BuildWeek() {
  return (
    <div aria-hidden className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] bg-green-900 p-8 text-white shadow-[var(--shadow-lift)]">
      <div>
        <p className="font-display text-xs font-semibold uppercase tracking-widest text-gold-300">Your week, assembled</p>
        <p className="mt-3 max-w-sm font-display text-3xl font-extrabold leading-tight tracking-tight">
          Every class in its place. Nothing on top of anything else.
        </p>
      </div>

      <div className="mx-auto w-full max-w-lg">
        <div className="grid grid-cols-[1.75rem_1fr] gap-x-2">
          <span />
          <div className="grid grid-cols-6 pb-2 text-center text-[0.7rem] font-semibold text-white/55">
            {DAYS.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-rows-8 text-right text-[0.65rem] text-white/40">
            {HOURS.map((h) => <span key={h} className="-translate-y-1.5">{h}</span>)}
          </div>
          <div className="relative aspect-[6/6.5] overflow-hidden rounded-xl bg-white"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--color-green-100) 1px, transparent 1px), linear-gradient(to bottom, var(--color-green-100) 1px, transparent 1px)',
              backgroundSize: 'calc(100% / 6) calc(100% / 8)',
            }}>
            {CLASSES.flatMap((c, i) =>
              c.meets.map(([col, row, rows]) => {
                const k = COURSE_COLORS[c.color]
                return (
                  <span key={`${c.code}-${col}`} className="build-in absolute rounded-md p-1.5 text-[0.6rem] font-semibold leading-tight sm:text-[0.7rem]"
                    style={{
                      ['--i' as string]: i,
                      left: `calc(${col} * 100% / 6 + 2px)`, width: 'calc(100% / 6 - 4px)',
                      top: `calc(${row} * 100% / 8 + 2px)`, height: `calc(${rows} * 100% / 8 - 4px)`,
                      background: k.bg, color: k.text, borderLeft: `3px solid ${k.border}`,
                    }}>
                    {c.code}
                  </span>
                )
              }),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <p className="relative h-5 flex-1 text-xs font-semibold text-white/80 sm:text-sm">
          {CLASSES.map((c, i) => <span key={c.code} style={{ ['--i' as string]: i }} className="build-say absolute left-0 top-0 whitespace-nowrap">{c.says}</span>)}
        </p>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1.5 text-xs font-bold text-green-900">
          <Check size={13} aria-hidden /> 0 conflicts
        </span>
      </div>
    </div>
  )
}

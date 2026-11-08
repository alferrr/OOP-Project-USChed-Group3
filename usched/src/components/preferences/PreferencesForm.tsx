import { ChevronDown, ChevronRight, RotateCcw, ShieldAlert, ThumbsUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { DayCode, Preferences } from '../../api/types'
import { DAYS } from '../../lib/days'
import { dayShort, format12 } from '../../lib/time'
import { emptyPreferences } from '../../store/planStore'

interface Props {
  value: Preferences
  onChange: (p: Preferences) => void
}

/** Turns "" / NaN into null so blank fields are simply not sent. */
const num = (v: string): number | null => (v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** Every half-hour from 6:00 AM to 9:30 PM, for the earliest-start/latest-end scroll pickers. */
function timeSlots(): string[] {
  const out: string[] = []
  for (let m = 6 * 60; m <= 21 * 60 + 30; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}
const TIME_SLOTS = timeSlots()

/** How many individual settings are actually active, so the count means something even collapsed. */
function countActive({ hard, soft }: Preferences): number {
  let n = 0
  if (hard.maxSchoolDays != null) n++
  if (hard.maxClassesPerDay != null) n++
  if (hard.minBreakMinutes != null) n++
  if (hard.earliestStart) n++
  if (hard.latestEnd) n++
  if (hard.avoidDays && hard.avoidDays.length > 0) n++
  if (soft.preferMorning || soft.preferAfternoon) n++
  if (soft.minimizeGaps) n++
  if (soft.minimizeDays) n++
  if (soft.prioritizeLunchBreak) n++
  return n
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-green-900/80">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (v: boolean) => void; title: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-green-50/70">
      <input type="checkbox" className="mt-0.5 size-4 accent-green-700" checked={checked}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-green-900">{title}</span>
        <span className="block text-xs text-green-900/60">{description}</span>
      </span>
    </label>
  )
}

/** A scrollable list of options, one always highlighted - for anything time-related, instead of the
 * native time/select inputs whose look varies wildly (and clunkily) from browser to browser. */
function ScrollPicker({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="text-xs font-medium text-green-900/80">{label}</span>
      <div role="listbox" tabIndex={-1} aria-label={label} className="mt-1 max-h-36 overflow-y-auto rounded-md border border-green-100"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
          e.preventDefault()
          const i = options.findIndex((o) => o.value === value)
          const next = options[Math.min(options.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]
          if (next) {
            onChange(next.value)
            e.currentTarget.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus()
          }
        }}>
        {options.map((o) => (
          <button key={o.value} type="button" role="option" aria-selected={value === o.value} data-value={o.value}
            tabIndex={value === o.value ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-300 ${
              value === o.value ? 'bg-gold-100 font-medium text-green-900' : 'text-green-900/80 hover:bg-green-50'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const TIME_OF_DAY_OPTIONS = [
  { value: 'none', label: 'No preference' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
]
const ANY_TIME_OPTIONS = [{ value: '', label: 'Any time' }, ...TIME_SLOTS.map((t) => ({ value: t, label: format12(t) }))]

export default function PreferencesForm({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { hard, soft } = value
  const setHard = (patch: Partial<Preferences['hard']>) => onChange({ ...value, hard: { ...hard, ...patch } })
  const setSoft = (patch: Partial<Preferences['soft']>) => onChange({ ...value, soft: { ...soft, ...patch } })
  const avoid = hard.avoidDays ?? []
  const toggleDay = (d: DayCode) => setHard({ avoidDays: avoid.includes(d) ? avoid.filter((x) => x !== d) : [...avoid, d] })
  const timeOfDay = soft.preferMorning ? 'morning' : soft.preferAfternoon ? 'afternoon' : 'none'
  const active = countActive(value)
  const field = 'mt-1 w-full rounded-md border border-green-100 px-2 py-1.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-gold-300'
  const dayPill = (selected: boolean) =>
    `cursor-pointer select-none rounded-full border px-3 py-1 text-sm transition-colors ${
      selected ? 'border-gold-500 bg-gold-100 font-medium text-green-900' : 'border-green-100 text-green-900/70 hover:border-green-300'}`

  return (
    <div className="rounded-lg border border-green-100 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen(!open)} aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left font-semibold text-green-800">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Preferences
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            {active === 0 ? 'none set' : `${active} set`}
          </span>
        </button>
        {active > 0 && (
          <button onClick={() => onChange(emptyPreferences())}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
            <RotateCcw size={12} aria-hidden /> Reset
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-green-100 p-3">
          <fieldset className="rounded-md border border-green-100 p-3">
            <legend className="-ml-1 flex items-center gap-1.5 px-1 font-medium text-green-900">
              <ShieldAlert size={15} className="text-green-700" aria-hidden /> Must follow
            </legend>
            <p className="mb-3 text-xs text-green-900/60">Any schedule that breaks these is dropped entirely, not just ranked lower.</p>
            {/* Always one column: this form is embedded in a fixed ~20rem sidebar on desktop, narrower
                than any viewport-based breakpoint would ever reflect, so a viewport-driven multi-column
                grid here just crams everything into that same narrow width regardless of screen size. */}
            <div className="grid grid-cols-1 gap-3">
              <Field label="Max school days">
                <input type="number" min={1} max={6} placeholder="No limit" className={field} value={hard.maxSchoolDays ?? ''}
                  onChange={(e) => setHard({ maxSchoolDays: num(e.target.value) })} />
              </Field>
              <Field label="Max classes / day">
                <input type="number" min={1} placeholder="No limit" className={field} value={hard.maxClassesPerDay ?? ''}
                  onChange={(e) => setHard({ maxClassesPerDay: num(e.target.value) })} />
              </Field>
              <Field label="Min break (mins)">
                <input type="number" min={0} step={5} placeholder="e.g. 15" className={field} value={hard.minBreakMinutes ?? ''}
                  onChange={(e) => setHard({ minBreakMinutes: num(e.target.value) })} />
              </Field>
              <ScrollPicker label="Earliest start" options={ANY_TIME_OPTIONS} value={hard.earliestStart ?? ''}
                onChange={(v) => setHard({ earliestStart: v || null })} />
              <ScrollPicker label="Latest end" options={ANY_TIME_OPTIONS} value={hard.latestEnd ?? ''}
                onChange={(v) => setHard({ latestEnd: v || null })} />
            </div>
            <div className="mt-3" role="group" aria-label="Days to avoid">
              <span className="text-xs font-medium text-green-900/80">Avoid these days</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <label key={d} className={dayPill(avoid.includes(d))}>
                    <input type="checkbox" className="sr-only" checked={avoid.includes(d)} onChange={() => toggleDay(d)} />
                    {dayShort(d)}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-md border border-green-100 p-3">
            <legend className="-ml-1 flex items-center gap-1.5 px-1 font-medium text-green-900">
              <ThumbsUp size={15} className="text-green-700" aria-hidden /> Nice to have
            </legend>
            <p className="mb-3 text-xs text-green-900/60">These only nudge which schedules rank higher - nothing is ever dropped for them.</p>
            <div className="max-w-xs">
              <ScrollPicker label="Time of day" options={TIME_OF_DAY_OPTIONS} value={timeOfDay}
                onChange={(t) => setSoft({ preferMorning: t === 'morning', preferAfternoon: t === 'afternoon' })} />
            </div>
            <div className="mt-3">
              <Toggle checked={!!soft.minimizeGaps} onChange={(v) => setSoft({ minimizeGaps: v })}
                title="Fewer gaps between classes" description="Favor back-to-back schedules over spread-out ones." />
              <Toggle checked={!!soft.minimizeDays} onChange={(v) => setSoft({ minimizeDays: v })}
                title="Fewer school days" description="Favor cramming classes into fewer days on campus." />
              <Toggle checked={!!soft.prioritizeLunchBreak} onChange={(v) => setSoft({ prioritizeLunchBreak: v })}
                title="A real lunch break" description="Already favored by default (at least an hour); check this to weigh it even more." />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}

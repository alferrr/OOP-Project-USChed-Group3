import { ChevronRight, RotateCcw, Search, ShieldAlert, ThumbsUp, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { DayCode, Preferences } from '../../api/types'
import { DAYS } from '../../lib/days'
import { dayShort, format12 } from '../../lib/time'
import { emptyPreferences } from '../../store/planStore'

interface Props {
  value: Preferences
  onChange: (p: Preferences) => void
  /** Instructors teaching the selected courses, offered as people to avoid. */
  instructors?: { id: number; name: string }[]
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
  if (hard.avoidInstructorIds && hard.avoidInstructorIds.length > 0) n++
  if (soft.preferMorning || soft.preferAfternoon) n++
  if (soft.minimizeGaps) n++
  if (soft.minimizeDays) n++
  if (soft.prioritizeLunchBreak) n++
  if (soft.preferredInstructorIds && soft.preferredInstructorIds.length > 0) n++
  return n
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-green-900">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (v: boolean) => void; title: string; description: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-white">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 rounded accent-green-700" checked={checked}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-green-900">{title}</span>
        <span className="block text-sm text-green-900/70">{description}</span>
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
      <span className="text-sm font-semibold text-green-900">{label}</span>
      <div role="listbox" tabIndex={-1} aria-label={label} className="mt-1.5 max-h-36 overflow-y-auto rounded-2xl bg-white p-1"
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
            className={`block w-full whitespace-nowrap rounded-xl px-3 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400 ${
              value === o.value ? 'bg-gold-400 font-bold text-green-900' : 'text-green-900/80 hover:bg-green-50'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Searchable pill list of instructors; `selected` ids are highlighted, clicking toggles one. */
function InstructorPicker({ label, instructors, selected, onToggle, emptyText }: {
  label: string
  instructors: { id: number; name: string }[]
  selected: number[]
  onToggle: (id: number) => void
  emptyText: string
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  // Selected instructors always stay visible, so a search never hides what is already chosen.
  const shown = instructors.filter((i) => q === '' || selected.includes(i.id) || i.name.toLowerCase().includes(q))
  return (
    <div role="group" aria-label={label}>
      <span className="text-sm font-semibold text-green-900">{label}</span>
      {instructors.length === 0 ? (
        <p className="mt-1.5 text-sm text-green-900/70">{emptyText}</p>
      ) : (
        <>
          <div className="relative mt-1.5">
            <Search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-green-900/50" />
            <input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder="Search instructors" value={query}
              onChange={(e) => setQuery(e.target.value)} className="control bg-white pl-9" />
          </div>
          <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {shown.map((i) => (
              <label key={i.id} className={`cursor-pointer select-none rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold-400 ${
                selected.includes(i.id) ? 'bg-gold-400 text-green-900' : 'bg-white text-green-900/70 hover:bg-green-100'}`}>
                <input type="checkbox" className="sr-only" checked={selected.includes(i.id)} onChange={() => onToggle(i.id)} />
                {i.name}
              </label>
            ))}
            {shown.length === 0 && <p className="text-sm text-green-900/70">No instructors match “{query.trim()}”.</p>}
          </div>
        </>
      )}
    </div>
  )
}

const TIME_OF_DAY_OPTIONS = [
  { value: 'none', label: 'No preference' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
]
const ANY_TIME_OPTIONS = [{ value: '', label: 'Any time' }, ...TIME_SLOTS.map((t) => ({ value: t, label: format12(t) }))]

// On desktop this card sits in a sticky column, so only its body (not the page or the column) scrolls.
export default function PreferencesForm({ value, onChange, instructors = [] }: Props) {
  // `open` mounts the centered panel; `closing` keeps it on screen for the exit animation.
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const close = () => {
    setClosing(true)
    setTimeout(() => { setOpen(false); setClosing(false); opener.current?.focus() }, 200)
  }
  useEffect(() => {
    if (!open) return
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const { hard, soft } = value
  const setHard = (patch: Partial<Preferences['hard']>) => onChange({ ...value, hard: { ...hard, ...patch } })
  const setSoft = (patch: Partial<Preferences['soft']>) => onChange({ ...value, soft: { ...soft, ...patch } })
  const avoid = hard.avoidDays ?? []
  const toggleDay = (d: DayCode) => setHard({ avoidDays: avoid.includes(d) ? avoid.filter((x) => x !== d) : [...avoid, d] })
  const avoidedInstructors = hard.avoidInstructorIds ?? []
  const preferredInstructors = soft.preferredInstructorIds ?? []
  // An instructor is either avoided or preferred, never both: picking one side clears the other.
  const toggleAvoided = (id: number) => {
    const on = avoidedInstructors.includes(id)
    onChange({
      hard: { ...hard, avoidInstructorIds: on ? avoidedInstructors.filter((x) => x !== id) : [...avoidedInstructors, id] },
      soft: { ...soft, preferredInstructorIds: preferredInstructors.filter((x) => x !== id) },
    })
  }
  const togglePreferred = (id: number) => {
    const on = preferredInstructors.includes(id)
    onChange({
      hard: { ...hard, avoidInstructorIds: avoidedInstructors.filter((x) => x !== id) },
      soft: { ...soft, preferredInstructorIds: on ? preferredInstructors.filter((x) => x !== id) : [...preferredInstructors, id] },
    })
  }
  const timeOfDay = soft.preferMorning ? 'morning' : soft.preferAfternoon ? 'afternoon' : 'none'
  const active = countActive(value)
  const field = 'control mt-1.5 bg-white'
  const dayPill = (selected: boolean) =>
    `cursor-pointer select-none rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold-400 ${
      selected ? 'bg-gold-400 text-green-900' : 'bg-white text-green-900/70 hover:bg-green-100'}`

  const panel = (
    <div className="backdrop fixed inset-0 z-50 flex items-center justify-center bg-green-900/50 p-4 backdrop-blur-sm"
      data-closing={closing || undefined} onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="preferences-title" tabIndex={-1}
        data-closing={closing || undefined}
        className="pop flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[2rem] bg-white shadow-[var(--shadow-lift)] outline-none">
        <div className="flex items-center gap-2 px-6 pb-2 pt-5">
          <h2 id="preferences-title" className="flex-1 text-2xl font-extrabold text-green-900">Preferences</h2>
          {active > 0 && (
            <button onClick={() => onChange(emptyPreferences())}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100">
              <RotateCcw size={12} aria-hidden /> Reset
            </button>
          )}
          <button onClick={close} aria-label="Close preferences"
            className="rounded-full p-2 text-green-700 transition-colors hover:bg-green-100">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto px-6 pb-4 md:grid-cols-2">
        <fieldset className="rounded-2xl bg-green-50 p-4">
          <legend className="float-left mb-2 flex w-full items-center gap-1.5 font-bold text-green-900">
            <ShieldAlert size={15} className="text-green-700" aria-hidden /> Must follow
          </legend>
          <p className="clear-both mb-3 text-sm text-green-900/70">Any schedule that breaks these is dropped entirely, not just ranked lower.</p>
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
            <span className="text-sm font-semibold text-green-900">Avoid these days</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <label key={d} className={dayPill(avoid.includes(d))}>
                  <input type="checkbox" className="sr-only" checked={avoid.includes(d)} onChange={() => toggleDay(d)} />
                  {dayShort(d)}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <InstructorPicker label="Avoid these instructors" instructors={instructors} selected={avoidedInstructors}
              onToggle={toggleAvoided} emptyText="Select courses to see who teaches them." />
          </div>
        </fieldset>

        <fieldset className="rounded-2xl bg-green-50 p-4">
          <legend className="float-left mb-2 flex w-full items-center gap-1.5 font-bold text-green-900">
            <ThumbsUp size={15} className="text-green-700" aria-hidden /> Nice to have
          </legend>
          <p className="clear-both mb-3 text-sm text-green-900/70">These only nudge which schedules rank higher - nothing is ever dropped for them.</p>
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
          <div className="mt-3">
            <InstructorPicker label="Preferred instructors" instructors={instructors} selected={preferredInstructors}
              onToggle={togglePreferred} emptyText="Select courses to see who teaches them." />
          </div>
        </fieldset>
        </div>
        <div className="flex justify-end px-6 pb-5 pt-2">
          <button type="button" onClick={close} className="btn btn-primary">Done</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="surface shadow-[var(--shadow-lift)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <button ref={opener} onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-haspopup="dialog"
          className="flex flex-1 items-center gap-2 text-left text-lg font-bold text-green-900">
          <ChevronRight size={16} aria-hidden />
          Preferences
          <span className="chip">
            {active === 0 ? 'none set' : `${active} set`}
          </span>
        </button>
        {active > 0 && (
          <button onClick={() => onChange(emptyPreferences())}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100">
            <RotateCcw size={12} aria-hidden /> Reset
          </button>
        )}
      </div>
      {open && createPortal(panel, document.body)}
    </div>
  )
}

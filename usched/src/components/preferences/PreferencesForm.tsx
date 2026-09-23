import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { DayCode, Preferences } from '../../api/types'
import { DAYS } from '../../lib/days'
import { dayShort } from '../../lib/time'
import { emptyPreferences } from '../../store/planStore'

interface Props {
  value: Preferences
  onChange: (p: Preferences) => void
}

/** Turns "" / NaN into null so blank fields are simply not sent. */
const num = (v: string): number | null => (v === '' || Number.isNaN(Number(v)) ? null : Number(v))

export default function PreferencesForm({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { hard, soft } = value
  const setHard = (patch: Partial<Preferences['hard']>) => onChange({ ...value, hard: { ...hard, ...patch } })
  const setSoft = (patch: Partial<Preferences['soft']>) => onChange({ ...value, soft: { ...soft, ...patch } })
  const avoid = hard.avoidDays ?? []
  const toggleDay = (d: DayCode) => setHard({ avoidDays: avoid.includes(d) ? avoid.filter((x) => x !== d) : [...avoid, d] })
  const timeOfDay = soft.preferMorning ? 'morning' : soft.preferAfternoon ? 'afternoon' : 'none'
  const field = 'mt-1 w-full rounded-md border border-green-100 px-2 py-1.5 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-gold-300'

  return (
    <div className="rounded-lg border border-green-100">
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-green-800">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Preferences (optional)
      </button>
      {open && (
        <div className="space-y-4 border-t border-green-100 p-3 text-sm text-green-900">
          <fieldset>
            <legend className="font-medium text-green-800">Must follow (schedules that break these are dropped)</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label>Max school days
                <input type="number" min={1} max={6} className={field} value={hard.maxSchoolDays ?? ''}
                  onChange={(e) => setHard({ maxSchoolDays: num(e.target.value) })} /></label>
              <label>Max classes per day
                <input type="number" min={1} className={field} value={hard.maxClassesPerDay ?? ''}
                  onChange={(e) => setHard({ maxClassesPerDay: num(e.target.value) })} /></label>
              <label>Min break (minutes)
                <input type="number" min={0} step={5} className={field} value={hard.minBreakMinutes ?? ''}
                  onChange={(e) => setHard({ minBreakMinutes: num(e.target.value) })} /></label>
              <span />
              <label>Earliest start
                <input type="time" className={field} value={hard.earliestStart ?? ''}
                  onChange={(e) => setHard({ earliestStart: e.target.value || null })} /></label>
              <label>Latest end
                <input type="time" className={field} value={hard.latestEnd ?? ''}
                  onChange={(e) => setHard({ latestEnd: e.target.value || null })} /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Days to avoid">
              <span className="w-full">Avoid these days</span>
              {DAYS.map((d) => (
                <label key={d} className={`cursor-pointer rounded-full border px-3 py-1 ${
                  avoid.includes(d) ? 'border-gold-500 bg-gold-100' : 'border-green-100'}`}>
                  <input type="checkbox" className="sr-only" checked={avoid.includes(d)} onChange={() => toggleDay(d)} />
                  {dayShort(d)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-green-800">Nice to have (only affects ranking)</legend>
            <div className="mt-2 space-y-2">
              <div className="flex gap-4" role="radiogroup" aria-label="Time of day">
                {(['none', 'morning', 'afternoon'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1 capitalize">
                    <input type="radio" name="tod" className="accent-green-700" checked={timeOfDay === t}
                      onChange={() => setSoft({ preferMorning: t === 'morning', preferAfternoon: t === 'afternoon' })} />
                    {t === 'none' ? 'No preference' : t}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-green-700" checked={!!soft.minimizeGaps}
                  onChange={(e) => setSoft({ minimizeGaps: e.target.checked })} /> Fewer gaps between classes
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-green-700" checked={!!soft.minimizeDays}
                  onChange={(e) => setSoft({ minimizeDays: e.target.checked })} /> Fewer school days
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-green-700" checked={!!soft.prioritizeLunchBreak}
                  onChange={(e) => setSoft({ prioritizeLunchBreak: e.target.checked })} /> A real lunch break (at least an hour, even unchecked)
              </label>
            </div>
          </fieldset>
          <button onClick={() => onChange(emptyPreferences())} className="text-green-700 underline">Clear preferences</button>
        </div>
      )}
    </div>
  )
}

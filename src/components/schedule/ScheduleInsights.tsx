import type { ComponentType } from 'react'
import {
  Bus, CalendarRange, Coffee, Flame, MapPin, Moon, Sparkles, Sun, Sunrise, Users, Zap,
} from 'lucide-react'
import type { RankedSchedule } from '../../api/types'
import { scheduleInsights, type Insight } from '../../lib/insights'

const ICON: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  campus: MapPin, commute: Bus, lunch: Coffee, gaps: Zap, days: CalendarRange, morning: Sun,
  longday: Flame, early: Sunrise, late: Moon, slots: Users,
}

const TONE = {
  good: { badge: 'bg-green-100 text-green-700', text: 'text-green-900' },
  info: { badge: 'bg-green-50 text-green-600', text: 'text-green-900/90' },
  caution: { badge: 'bg-amber-100 text-amber-800', text: 'text-green-900' },
} as const

function NoteRow({ note }: { note: Insight }) {
  const Icon = ICON[note.key] ?? Sparkles
  const tone = TONE[note.tone]
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
        <Icon size={14} aria-hidden />
      </span>
      <span className={`text-[0.9375rem] leading-snug ${tone.text}`}>{note.text}</span>
    </li>
  )
}

/** A short, plain-language read of the schedule: only what's worth calling out, not a fixed checklist. */
export default function ScheduleInsights({ schedule }: { schedule: RankedSchedule }) {
  const notes = scheduleInsights(schedule)
  if (notes.length === 0) return null

  const upsides = notes.filter((n) => n.tone !== 'caution')
  const cautions = notes.filter((n) => n.tone === 'caution')

  return (
    <div className="surface p-6">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-green-900">
          <Sparkles size={18} className="text-green-600" aria-hidden /> Smart analysis
        </h2>
        <span className="shrink-0 text-sm text-green-900/70">
          {upsides.length > 0 && `${upsides.length} at a glance`}
          {upsides.length > 0 && cautions.length > 0 && ' · '}
          {cautions.length > 0 && `${cautions.length} to watch`}
        </span>
      </div>
      <div className={`grid gap-x-8 ${upsides.length > 0 && cautions.length > 0 ? 'sm:grid-cols-2' : ''}`}>
        {upsides.length > 0 && (
          <div>
            <h3 className="pt-3 text-base font-bold text-green-900">At a glance</h3>
            <ul className="divide-y divide-green-50">{upsides.map((n) => <NoteRow key={n.key} note={n} />)}</ul>
          </div>
        )}
        {cautions.length > 0 && (
          <div>
            <h3 className="pt-3 text-base font-bold text-green-900">Heads up</h3>
            <ul className="divide-y divide-green-50">{cautions.map((n) => <NoteRow key={n.key} note={n} />)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react'
import type { RankedSchedule } from '../../api/types'
import { scheduleInsights } from '../../lib/insights'

const ICON = { good: CheckCircle2, caution: AlertTriangle, info: Info } as const
const COLOR = {
  good: 'border-green-100 bg-green-50 text-green-900',
  caution: 'border-gold-300 bg-gold-50 text-green-900',
  info: 'border-green-100 bg-white text-green-900',
} as const

/** A short, plain-language read of the schedule: only what's worth calling out, not a fixed checklist. */
export default function ScheduleInsights({ schedule }: { schedule: RankedSchedule }) {
  const notes = scheduleInsights(schedule)
  if (notes.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-green-800">
        <Sparkles size={16} className="text-gold-600" aria-hidden /> Smart analysis
      </h2>
      <ul className="space-y-2 text-sm">
        {notes.map((n) => {
          const Icon = ICON[n.tone]
          return (
            <li key={n.key} className={`flex items-start gap-2 rounded-lg border p-2.5 ${COLOR[n.tone]}`}>
              <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{n.text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

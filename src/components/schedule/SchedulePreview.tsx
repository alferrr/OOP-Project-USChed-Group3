import type { Section } from '../../api/types'
import { COURSE_COLORS, DAYS } from '../../lib/days'
import { gridBounds, layoutBlocks } from '../../lib/calendarLayout'

/** A small, non-interactive weekly grid: just enough to recognise a schedule by its shape. */
export default function SchedulePreview({ sections }: { sections: Section[] }) {
  const { startMin, endMin } = gridBounds(sections)
  const span = endMin - startMin
  const blocks = layoutBlocks(sections, startMin)
  const rowsPx = (span / 30) * 28 // layoutBlocks positions are in 28px rows; scale them to percentages
  return (
    <div aria-hidden className="relative h-32 overflow-hidden rounded-xl bg-green-50">
      <div className="absolute inset-0 grid grid-cols-6">
        {DAYS.map((d) => <span key={d} className="border-r border-green-100 last:border-r-0" />)}
      </div>
      {blocks.map((b) => {
        const c = COURSE_COLORS[b.colorIndex % COURSE_COLORS.length]
        return (
          <span key={b.key} className="absolute rounded-[3px]"
            style={{
              left: `calc(${DAYS.indexOf(b.day)} * 100% / 6 + 2px)`,
              width: 'calc(100% / 6 - 4px)',
              top: `${(b.top / rowsPx) * 100}%`,
              height: `${(b.height / rowsPx) * 100}%`,
              background: c.bg,
              borderLeft: `3px solid ${c.border}`,
            }} />
        )
      })}
    </div>
  )
}

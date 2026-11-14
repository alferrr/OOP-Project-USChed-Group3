import type { Section } from '../../api/types'
import { COURSE_COLORS, DAYS } from '../../lib/days'
import { dayShort, format12 } from '../../lib/time'
import { ROW_PX, gridBounds, layoutBlocks } from '../../lib/calendarLayout'

export default function WeeklyCalendar({ sections }: { sections: Section[] }) {
  const { startMin, endMin } = gridBounds(sections)
  const rows = (endMin - startMin) / 30
  const blocks = layoutBlocks(sections, startMin)

  return (
    <div role="region" aria-label="Weekly schedule, scroll sideways for more days"
      // a horizontally scrollable region must be focusable so keyboard users can scroll it
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0} className="surface overflow-x-auto p-3 print:overflow-visible print:p-0">
      <div className="grid min-w-[52rem]" style={{ gridTemplateColumns: '4.5rem repeat(6, minmax(0, 1fr))' }}>
        <div className="border-b border-green-100" />
        {DAYS.map((d) => (
          <div key={d} className="border-b border-green-100 py-2.5 text-center text-sm font-extrabold tracking-wide text-green-900">
            {dayShort(d)}
          </div>
        ))}

        <div className="relative" style={{ height: rows * ROW_PX }}>
          {Array.from({ length: rows }, (_, i) => {
            const mins = startMin + i * 30
            const onHour = mins % 60 === 0
            return (
              <div key={i} style={{ top: i * ROW_PX }}
                className={`absolute right-2 -translate-y-2 text-xs ${onHour ? 'font-semibold text-green-900/80' : 'text-green-900/65'}`}>
                {i === 0 ? '' : format12(`${Math.floor(mins / 60)}:${mins % 60}`)}
              </div>
            )
          })}
        </div>

        {DAYS.map((d) => (
          <div key={d} className="relative" style={{ height: rows * ROW_PX }}
            data-testid={`col-${d}`}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={`absolute inset-x-1 border-t ${i % 2 === 0 ? 'border-green-100' : 'border-green-50'}`}
                style={{ top: i * ROW_PX }} />
            ))}
            {blocks.filter((b) => b.day === d).map((b) => {
              const c = COURSE_COLORS[b.colorIndex % COURSE_COLORS.length]
              return (
                <div key={b.key} title={b.title} data-testid="block"
                  className="absolute inset-x-1 overflow-hidden rounded-xl px-2 py-1 text-xs leading-tight transition-shadow duration-200 hover:shadow-[var(--shadow-card)]"
                  style={{ top: b.top + 1, height: b.height - 3, background: c.bg, boxShadow: `inset 0 0 0 1.5px ${c.border}55`, color: c.text }}>
                  <p className="font-bold">{b.code} · {b.section}</p>
                  <p>{b.time}</p>
                  {b.room && <p>{b.room}</p>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

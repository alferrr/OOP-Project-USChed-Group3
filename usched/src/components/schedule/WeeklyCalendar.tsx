import type { DayCode, Section } from '../../api/types'
import { COURSE_COLORS, DAYS } from '../../lib/days'
import { dayShort, format12, formatRange, toMinutes } from '../../lib/time'

const ROW_PX = 28 // one 30-minute row

export interface Block {
  key: string
  day: DayCode
  top: number
  height: number
  colorIndex: number
  code: string
  section: string
  room: string | null
  time: string
  title: string
}

/** Pure layout: turns sections into absolutely-positioned blocks. Exported for testing. */
export function layoutBlocks(sections: Section[], startMin: number): Block[] {
  const codes = [...new Set(sections.map((s) => s.courseCode))]
  return sections.flatMap((s) =>
    s.meetings.map((m, i) => ({
      key: `${s.sectionId}-${i}`,
      day: m.day,
      top: ((toMinutes(m.start) - startMin) / 30) * ROW_PX,
      height: ((toMinutes(m.end) - toMinutes(m.start)) / 30) * ROW_PX,
      colorIndex: codes.indexOf(s.courseCode),
      code: s.courseCode,
      section: s.sectionCode,
      room: m.room,
      time: formatRange(m.start, m.end),
      title: `${s.courseName} · ${s.instructor ?? 'Instructor TBA'}${m.type === 'LAB' ? ' · Lab' : ''}`,
    })),
  )
}

export function gridBounds(sections: Section[]): { startMin: number; endMin: number } {
  const all = sections.flatMap((s) => s.meetings)
  const start = Math.min(420, ...all.map((m) => toMinutes(m.start)))
  const end = Math.max(1080, ...all.map((m) => toMinutes(m.end)))
  return { startMin: Math.floor(start / 60) * 60, endMin: Math.ceil(end / 60) * 60 }
}

export default function WeeklyCalendar({ sections }: { sections: Section[] }) {
  const { startMin, endMin } = gridBounds(sections)
  const rows = (endMin - startMin) / 30
  const blocks = layoutBlocks(sections, startMin)

  return (
    <div className="overflow-x-auto rounded-lg border border-green-100">
      <div className="grid min-w-[42rem]" style={{ gridTemplateColumns: '4.5rem repeat(6, minmax(0, 1fr))' }}>
        <div className="border-b border-green-100 bg-green-800" />
        {DAYS.map((d) => (
          <div key={d} className="border-b border-l border-green-700 bg-green-800 py-2 text-center text-sm font-semibold text-white">
            {dayShort(d)}
          </div>
        ))}

        <div className="relative" style={{ height: rows * ROW_PX }}>
          {Array.from({ length: rows }, (_, i) => {
            const mins = startMin + i * 30
            const onHour = mins % 60 === 0
            return (
              <div key={i} style={{ top: i * ROW_PX }}
                className={`absolute right-2 -translate-y-2 text-xs ${onHour ? 'font-medium text-green-900/70' : 'text-green-900/45'}`}>
                {i === 0 ? '' : format12(`${Math.floor(mins / 60)}:${mins % 60}`)}
              </div>
            )
          })}
        </div>

        {DAYS.map((d) => (
          <div key={d} className="relative border-l border-green-100" style={{ height: rows * ROW_PX }}
            data-testid={`col-${d}`}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={`absolute inset-x-0 border-t ${i % 2 === 0 ? 'border-green-100' : 'border-green-50'}`}
                style={{ top: i * ROW_PX }} />
            ))}
            {blocks.filter((b) => b.day === d).map((b) => {
              const c = COURSE_COLORS[b.colorIndex % COURSE_COLORS.length]
              return (
                <div key={b.key} title={b.title} data-testid="block"
                  className="absolute inset-x-0.5 overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-xs leading-tight"
                  style={{ top: b.top, height: b.height - 2, background: c.bg, borderColor: c.border, color: c.text }}>
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

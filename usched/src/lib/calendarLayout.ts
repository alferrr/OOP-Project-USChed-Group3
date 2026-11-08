import type { DayCode, Section } from '../api/types'
import { formatRange, toMinutes } from './time'

export const ROW_PX = 28 // one 30-minute row

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

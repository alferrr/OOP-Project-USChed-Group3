import type { DayCode, Section } from '../api/types'
import { campusOfRoom, TRAVEL_MINUTES } from './insights'
import { dayShort, format12, toMinutes } from './time'

export interface Overlap { a: string; b: string; day: DayCode; text: string }
export interface TravelRisk { a: string; b: string; day: DayCode; gap: number; text: string }

const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Pairs of picked sections that meet at the same time on the same day: impossible to attend both. */
export function findOverlaps(sections: Section[]): Overlap[] {
  const out: Overlap[] = []
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      for (const x of sections[i].meetings) {
        for (const y of sections[j].meetings) {
          if (x.day !== y.day) continue
          if (toMinutes(x.start) < toMinutes(y.end) && toMinutes(y.start) < toMinutes(x.end)) {
            out.push({
              a: sections[i].courseCode, b: sections[j].courseCode, day: x.day,
              text: `${sections[i].courseCode} and ${sections[j].courseCode} both meet on ${dayShort(x.day)} (${format12(x.start)}–${format12(x.end)} and ${format12(y.start)}–${format12(y.end)}).`,
            })
          }
        }
      }
    }
  }
  return out
}

/** Back-to-back classes on different campuses with too little time to travel between them (same rule as the generator). */
export function findTravelRisks(sections: Section[]): TravelRisk[] {
  const byDay = new Map<DayCode, { code: string; start: number; end: number; campus: string | null }[]>()
  for (const s of sections) {
    for (const m of s.meetings) {
      byDay.set(m.day, [...(byDay.get(m.day) ?? []), { code: s.courseCode, start: toMinutes(m.start), end: toMinutes(m.end), campus: campusOfRoom(m.room) }])
    }
  }
  const out: TravelRisk[] = []
  for (const [day, list] of byDay) {
    list.sort((p, q) => p.start - q.start)
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]
      const next = list[i]
      if (!prev.campus || !next.campus || prev.campus === next.campus) continue
      const gap = next.start - prev.end
      if (gap >= 0 && gap < TRAVEL_MINUTES) {
        out.push({
          a: prev.code, b: next.code, day, gap,
          text: `${prev.code} ends ${format12(minutesToTime(prev.end))} (${prev.campus}) and ${next.code} starts ${format12(minutesToTime(next.start))} (${next.campus}) on ${dayShort(day)}: only ${gap} min between campuses.`,
        })
      }
    }
  }
  return out
}

/** Whether a section would clash with any of the already-picked sections (used to flag choices before they are picked). */
export function clashesWith(section: Section, others: Section[]): string | null {
  const hit = findOverlaps([section, ...others.filter((o) => o.sectionId !== section.sectionId)]).find((o) => o.a === section.courseCode || o.b === section.courseCode)
  return hit ? (hit.a === section.courseCode ? hit.b : hit.a) : null
}

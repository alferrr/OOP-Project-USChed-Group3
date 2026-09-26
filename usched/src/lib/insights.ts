import type { DayCode, RankedSchedule, Section } from '../api/types'
import { dayShort, format12, formatMinutes, toMinutes } from './time'

const NOON = 12 * 60
const EARLY = 7 * 60 // 7:00 AM
const LATE = 20 * 60 // 8:00 PM
const LOW_SLOTS = 3

/** Share of total class time that falls before noon, computed straight from the meetings themselves (not
 * the backend's Morning score, which flips direction under an afternoon preference). Null with no classes. */
function morningFraction(sections: Section[]): number | null {
  let morning = 0
  let total = 0
  for (const s of sections) {
    for (const m of s.meetings) {
      const start = toMinutes(m.start)
      const end = toMinutes(m.end)
      total += end - start
      if (start < NOON) morning += Math.min(end, NOON) - start
    }
  }
  return total === 0 ? null : morning / total
}

/** Earliest start and latest end, in minutes, for each day that has at least one class. */
function daySpans(sections: Section[]): Map<DayCode, { start: number; end: number }> {
  const spans = new Map<DayCode, { start: number; end: number }>()
  for (const s of sections) {
    for (const m of s.meetings) {
      const start = toMinutes(m.start)
      const end = toMinutes(m.end)
      const prev = spans.get(m.day)
      spans.set(m.day, prev ? { start: Math.min(prev.start, start), end: Math.max(prev.end, end) } : { start, end })
    }
  }
  return spans
}

/** The campus a room code belongs to, mirroring the backend: the suffix baked into the code decides it. */
export function campusOfRoom(room: string | null): string | null {
  if (!room) return null
  const upper = room.toUpperCase()
  if (upper.endsWith('TC')) return 'Talamban'
  if (upper.endsWith('MC')) return 'Main'
  return null
}

/** The campus most of a section's own meetings are held on, or null if none of them name a recognisable room. */
export function campusOfSection(section: Section): string | null {
  const counts = new Map<string, number>()
  for (const m of section.meetings) {
    const c = campusOfRoom(m.room)
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [c, n] of counts) {
    if (n > bestCount) {
      best = c
      bestCount = n
    }
  }
  return best
}

export interface Insight {
  key: string
  tone: 'good' | 'caution' | 'info'
  text: string
}

/**
 * A short, plain-language read of a ranked schedule: only the things worth calling out, not a fixed
 * checklist repeated every time. Built from data already on the page (stats, the score breakdown, and the
 * sections themselves), no extra request needed.
 */
export function scheduleInsights(schedule: RankedSchedule): Insight[] {
  const notes: Insight[] = []
  const { stats, sections, breakdown } = schedule

  // Campus: exact, computed straight from each section's own rooms (not an approximation).
  const campusCounts = new Map<string, number>()
  for (const s of sections) {
    const c = campusOfSection(s)
    if (c) campusCounts.set(c, (campusCounts.get(c) ?? 0) + 1)
  }
  const known = [...campusCounts.values()].reduce((a, b) => a + b, 0)
  if (known > 0) {
    const [majorCampus, majorCount] = [...campusCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (campusCounts.size === 1) {
      notes.push({ key: 'campus', tone: 'good', text: `All ${known} of your classes are on the ${majorCampus} campus.` })
    } else {
      const strayCount = known - majorCount
      notes.push({
        key: 'campus', tone: 'caution',
        text: `Mostly ${majorCampus} (${majorCount} of ${known} classes), but ${strayCount} ${strayCount === 1 ? 'class is' : 'classes are'} on the other campus - budget travel time between them.`,
      })
    }
  }

  // Lunch break: the breakdown already scored this per this exact schedule.
  if (breakdown.LunchBreak === 1) {
    notes.push({ key: 'lunch', tone: 'good', text: 'Every school day has a real lunch break.' })
  } else if (breakdown.LunchBreak === 0) {
    notes.push({ key: 'lunch', tone: 'caution', text: 'No day has a proper lunch break - classes run back-to-back straight through midday.' })
  }

  // Gaps: exact minutes, straight from stats.
  if (stats.totalGapMinutes === 0) {
    notes.push({ key: 'gaps', tone: 'good', text: 'No idle time at all - every day is fully back-to-back.' })
  } else if (stats.totalGapMinutes >= 180) {
    notes.push({ key: 'gaps', tone: 'caution', text: `${formatMinutes(stats.totalGapMinutes)} of gaps between classes across the week - a lot of idle time on campus.` })
  }

  // School days: fewer days on campus is a common, concrete want.
  if (stats.schoolDays <= 2) {
    notes.push({ key: 'days', tone: 'good', text: `Only ${stats.schoolDays} ${stats.schoolDays === 1 ? 'day' : 'days'} a week on campus - the rest of the week is free.` })
  } else if (stats.schoolDays >= 6) {
    notes.push({ key: 'days', tone: 'caution', text: 'Classes are spread across every day of the week, including Saturday.' })
  }

  // Morning/afternoon leaning: only worth a note when it is a clear, one-sided pattern.
  const morning = morningFraction(sections)
  if (morning !== null && morning >= 0.85) {
    notes.push({ key: 'morning', tone: 'info', text: 'Mostly morning classes - your afternoons are free.' })
  } else if (morning !== null && morning <= 0.15) {
    notes.push({ key: 'morning', tone: 'info', text: 'Mostly afternoon/evening classes - your mornings are free.' })
  }

  // Long days: a single day that runs open-to-close for 8+ hours is a real fatigue risk, gaps or not.
  const spans = [...daySpans(sections)].map(([day, span]) => ({ day, ...span, length: span.end - span.start }))
  const longest = spans.sort((a, b) => b.length - a.length)[0]
  if (longest && longest.length >= 8 * 60) {
    notes.push({
      key: 'longday', tone: 'caution',
      text: `${dayShort(longest.day)} runs ${formatMinutes(longest.length)} open-to-close (${format12(minutesToTime(longest.start))} - ${format12(minutesToTime(longest.end))}).`,
    })
  }

  // Very early or very late classes: worth flagging on top of the plain earliest/latest stat line.
  if (stats.earliestStart && toMinutes(stats.earliestStart) < EARLY) {
    notes.push({ key: 'early', tone: 'caution', text: `Starts as early as ${format12(stats.earliestStart)} on some days.` })
  }
  if (stats.latestEnd && toMinutes(stats.latestEnd) > LATE) {
    notes.push({ key: 'late', tone: 'caution', text: `Runs as late as ${format12(stats.latestEnd)} on some days.` })
  }

  // Low remaining slots: a real enrollment risk, not just a preference.
  const tight = sections
    .filter((s): s is Section & { availableSlots: number } => s.availableSlots !== null && s.availableSlots <= LOW_SLOTS)
    .sort((a, b) => a.availableSlots - b.availableSlots)
  if (tight.length > 0) {
    const worst = tight[0]
    const label = `${worst.courseCode} · ${worst.sectionCode}`
    const slotsText = worst.availableSlots === 0 ? 'is already full' : `has only ${worst.availableSlots} ${worst.availableSlots === 1 ? 'slot' : 'slots'} left`
    const rest = tight.length > 1 ? ` (and ${tight.length - 1} other ${tight.length === 2 ? 'section' : 'sections'} running low)` : ''
    notes.push({ key: 'slots', tone: 'caution', text: `${label} ${slotsText}${rest} - enroll early.` })
  }

  return notes
}

function minutesToTime(mins: number): string {
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

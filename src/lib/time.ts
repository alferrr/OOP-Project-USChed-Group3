import type { DayCode, Meeting } from '../api/types'

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function format12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

export function formatRange(start: string, end: string): string {
  return `${format12(start)} – ${format12(end)}`
}

export function formatMinutes(total: number): string {
  if (total <= 0) return 'None'
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

const SHORT: Record<DayCode, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' }
export const dayShort = (d: DayCode) => SHORT[d]

/** "Mon/Wed 8:00 AM – 9:30 AM" grouped by identical time and type. */
export function describeMeetings(meetings: Meeting[]): string[] {
  const groups = new Map<string, DayCode[]>()
  for (const m of meetings) {
    const key = `${m.type === 'LAB' ? 'Lab ' : ''}${formatRange(m.start, m.end)}${m.room ? ` · ${m.room}` : ''}`
    groups.set(key, [...(groups.get(key) ?? []), m.day])
  }
  return [...groups].map(([label, days]) => `${days.map(dayShort).join('/')} ${label}`)
}

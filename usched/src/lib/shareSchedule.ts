import type { DayCode, Meeting, SemesterCode, Section } from '../api/types'
import { DAYS } from './days'

/**
 * A schedule packed into a URL fragment (#...), so a link carries the schedule itself. The fragment is never
 * sent to any server: sharing needs no account, no storage, and nothing about the student beyond the
 * schedule they chose to share. Only what the calendar needs is included.
 */
export interface SharedSchedule {
  semester: SemesterCode
  academicYear: string
  sections: Section[]
}

type PackedMeeting = [DayCode, string, string, string | null, Meeting['type']]
type PackedSection = [string, string, number, string, string | null, PackedMeeting[]]
interface Packed { v: 1; s: SemesterCode; y: string; c: PackedSection[] }

const MAX_SECTIONS = 20
const MAX_MEETINGS = 12
const SEMESTERS: SemesterCode[] = ['1ST', '2ND', 'SUMMER']

export function encodeSchedule(s: SharedSchedule): string {
  const packed: Packed = {
    v: 1, s: s.semester, y: s.academicYear,
    c: s.sections.map((x) => [
      x.courseCode, x.courseName, x.units, x.sectionCode, x.instructor,
      x.meetings.map((m): PackedMeeting => [m.day, m.start, m.end, m.room, m.type]),
    ]),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(packed))
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max
const isTime = (v: unknown): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)
const isNullableStr = (v: unknown): v is string | null => v === null || isStr(v)

/** Returns null for anything that is not a well-formed schedule: a link is untrusted input. */
export function decodeSchedule(encoded: string): SharedSchedule | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    const json = new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)))
    const p = JSON.parse(json) as Partial<Packed>
    if (p.v !== 1 || !SEMESTERS.includes(p.s as SemesterCode) || !isStr(p.y, 20) || !Array.isArray(p.c)) return null
    if (p.c.length === 0 || p.c.length > MAX_SECTIONS) return null

    const sections: Section[] = []
    for (const [i, raw] of p.c.entries()) {
      if (!Array.isArray(raw) || raw.length !== 6) return null
      const [code, name, units, sectionCode, instructor, meetings] = raw
      if (!isStr(code, 40) || !isStr(name) || typeof units !== 'number' || !(units > 0 && units <= 12)
        || !isStr(sectionCode, 40) || !isNullableStr(instructor)
        || !Array.isArray(meetings) || meetings.length > MAX_MEETINGS) return null
      const parsed: Meeting[] = []
      for (const m of meetings) {
        if (!Array.isArray(m) || m.length !== 5) return null
        const [day, start, end, room, type] = m
        if (!(DAYS as readonly string[]).includes(day) || !isTime(start) || !isTime(end) || !isNullableStr(room)
          || (type !== 'LECTURE' && type !== 'LAB')) return null
        parsed.push({ day, start, end, room, type })
      }
      sections.push({ sectionId: i, courseCode: code, courseName: name, units, sectionCode,
        instructorId: null, instructor, availableSlots: null, meetings: parsed })
    }
    return { semester: p.s as SemesterCode, academicYear: p.y, sections }
  } catch {
    return null
  }
}

/** Absolute link to the read-only shared view. */
export function shareUrl(s: SharedSchedule, origin = window.location.origin): string {
  return `${origin}/shared#${encodeSchedule(s)}`
}

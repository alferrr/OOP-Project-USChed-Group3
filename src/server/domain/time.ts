import { InvalidCourseDataError, InvalidTimeRangeError } from '../errors'

/** Times of day are whole minutes since midnight. */
export type Minutes = number

export const NOON: Minutes = 12 * 60

export function hm(hours: number, minutes = 0): Minutes {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new InvalidCourseDataError(`Invalid time ${hours}:${minutes}`)
  }
  return hours * 60 + minutes
}

/** "09:05" (24-hour, zero padded) - the format the API speaks. */
export function formatTime(t: Minutes): string {
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Accepts "H:mm", "HH:mm" or "HH:mm:ss" (seconds ignored). Throws InvalidCourseDataError otherwise. */
export function parseTime(text: string): Minutes {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim())
  if (!m) throw new InvalidCourseDataError(`Invalid time: ${text}`)
  return hm(Number(m[1]), Number(m[2]))
}

/** Immutable half-open interval [start, end). Adjacent ranges do not overlap. */
export interface TimeRange {
  readonly start: Minutes
  readonly end: Minutes
}

export function timeRange(start: Minutes, end: Minutes): TimeRange {
  if (start == null || end == null) throw new InvalidTimeRangeError('Start and end time are required')
  if (!(start < end)) {
    throw new InvalidTimeRangeError(`Start (${formatTime(start)}) must be before end (${formatTime(end)})`)
  }
  return Object.freeze({ start, end })
}

export function rangeOf(start: string, end: string): TimeRange {
  return timeRange(parseTime(start), parseTime(end))
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end
}

export function durationMinutes(r: TimeRange): number {
  return r.end - r.start
}

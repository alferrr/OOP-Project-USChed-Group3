import { InvalidCourseDataError, MissingScheduleInfoError } from '../errors'
import { durationMinutes, overlaps, type Minutes, type TimeRange } from './time'

// ---- Value types ------------------------------------------------------------------------------------------

/** The API speaks these codes everywhere (query strings, JSON, database). */
export type Semester = '1ST' | '2ND' | 'SUMMER'
export const SEMESTERS: readonly Semester[] = ['1ST', '2ND', 'SUMMER']

export function semesterFromCode(code: string | null | undefined): Semester {
  const c = (code ?? '').trim().toUpperCase()
  const found = SEMESTERS.find((s) => s === c)
  if (!found) throw new InvalidCourseDataError(`Unknown semester: ${code}`)
  return found
}

/** Classes never meet on Sunday. Order is the week order. */
export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'
export const DAYS: readonly Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function dayFromCode(code: string | null | undefined): Day {
  const c = (code ?? '').trim().toUpperCase()
  const found = DAYS.find((d) => d === c)
  if (!found) throw new InvalidCourseDataError(`Unknown day: ${code}`)
  return found
}

export type MeetingType = 'LECTURE' | 'LAB'

export interface Room {
  readonly building: string | null
  readonly roomCode: string
  readonly campus: string | null
}

export function room(building: string | null, roomCode: string, campus: string | null): Room {
  if (!roomCode || !roomCode.trim()) throw new InvalidCourseDataError('Room code is required')
  return Object.freeze({ building, roomCode, campus })
}

export function roomLabel(r: Room | null): string {
  if (!r) return 'TBA'
  return !r.building || !r.building.trim() ? r.roomCode : `${r.building} ${r.roomCode}`
}

export interface Instructor {
  readonly id: number | null
  readonly name: string
}

export function instructor(id: number | null, name: string): Instructor {
  if (!name || !name.trim()) throw new InvalidCourseDataError('Name is required')
  return Object.freeze({ id, name: name.trim() })
}

/** One class session on one day. A section meeting M/W is stored as two Meetings. */
export interface Meeting {
  readonly day: Day
  readonly time: TimeRange
  readonly room: Room | null
  readonly type: MeetingType
}

export function meeting(type: MeetingType, day: Day, time: TimeRange, roomOrNull: Room | null): Meeting {
  if (!day || !time) throw new InvalidCourseDataError('Meeting day and time are required')
  return Object.freeze({ day, time, room: roomOrNull ?? null, type })
}

/** Same day and overlapping time. Adjacent meetings do not conflict. */
export function meetingsConflict(a: Meeting, b: Meeting): boolean {
  return a.day === b.day && overlaps(a.time, b.time)
}

// ---- Section / Course -------------------------------------------------------------------------------------

export class Section {
  readonly id: number | null
  readonly courseCode: string
  readonly courseName: string
  readonly units: number
  readonly sectionCode: string
  readonly instructor: Instructor | null
  readonly semester: Semester
  readonly academicYear: string
  readonly availableSlots: number | null
  readonly meetings: readonly Meeting[]

  constructor(args: {
    id: number | null
    courseCode: string
    courseName: string | null
    units: number
    sectionCode: string
    instructor: Instructor | null
    semester: Semester
    academicYear: string
    availableSlots: number | null
    meetings: readonly Meeting[]
  }) {
    if (!args.courseCode || !args.courseCode.trim()) throw new InvalidCourseDataError('Course code is required')
    if (!args.sectionCode || !args.sectionCode.trim()) {
      throw new InvalidCourseDataError(`Section code is required for ${args.courseCode}`)
    }
    if (!(args.units > 0)) throw new InvalidCourseDataError(`Units must be positive for ${args.courseCode}`)
    if (!args.semester || !args.academicYear || !args.academicYear.trim()) {
      throw new InvalidCourseDataError(`Semester and academic year are required for ${args.courseCode}`)
    }
    if (!args.meetings || args.meetings.length === 0) {
      throw new MissingScheduleInfoError(`${args.courseCode}-${args.sectionCode} has no meeting times`)
    }
    this.id = args.id
    this.courseCode = args.courseCode.trim()
    this.courseName = (args.courseName ?? '').trim()
    this.units = args.units
    this.sectionCode = args.sectionCode.trim()
    this.instructor = args.instructor
    this.semester = args.semester
    this.academicYear = args.academicYear.trim()
    this.availableSlots = args.availableSlots
    this.meetings = Object.freeze([...args.meetings])
  }

  label(): string {
    return `${this.courseCode}-${this.sectionCode}`
  }

  conflictsWith(other: Section): boolean {
    return this.meetings.some((a) => other.meetings.some((b) => meetingsConflict(a, b)))
  }

  toString(): string {
    return `Section[${this.label()}]`
  }
}

export class Course {
  readonly id: number | null
  readonly code: string
  readonly name: string
  readonly description: string | null
  readonly units: number
  readonly department: string | null
  readonly prerequisites: string | null
  readonly sections: readonly Section[]

  constructor(args: {
    id: number | null
    code: string
    name: string
    description?: string | null
    units: number
    department?: string | null
    prerequisites?: string | null
    sections: readonly Section[]
  }) {
    if (!args.code || !args.code.trim()) throw new InvalidCourseDataError('Course code is required')
    if (!args.name || !args.name.trim()) throw new InvalidCourseDataError(`Course name is required for ${args.code}`)
    if (!(args.units > 0)) throw new InvalidCourseDataError(`Units must be positive for ${args.code}`)
    if (!args.sections) throw new InvalidCourseDataError(`Sections list is required for ${args.code}`)
    this.id = args.id
    this.code = args.code.trim()
    this.name = args.name.trim()
    this.description = args.description ?? null
    this.units = args.units
    this.department = args.department ?? null
    this.prerequisites = args.prerequisites ?? null
    this.sections = Object.freeze([...args.sections])
  }
}

// ---- Schedule ---------------------------------------------------------------------------------------------

/** Immutable set of sections, one per selected course. */
export class Schedule {
  readonly sections: readonly Section[]
  private byDay: Map<Day, Meeting[]> | null = null

  private constructor(sections: readonly Section[]) {
    this.sections = Object.freeze([...sections])
  }

  static of(sections: readonly Section[]): Schedule {
    return new Schedule(sections)
  }

  conflictsWith(candidate: Section): boolean {
    return this.sections.some((s) => s.conflictsWith(candidate))
  }

  hasConflict(): boolean {
    for (let i = 0; i < this.sections.length; i++) {
      for (let j = i + 1; j < this.sections.length; j++) {
        if (this.sections[i].conflictsWith(this.sections[j])) return true
      }
    }
    return false
  }

  totalUnits(): number {
    return this.sections.reduce((sum, s) => sum + s.units, 0)
  }

  /** Days with at least one class, in week order. */
  schoolDays(): Day[] {
    const days = new Set<Day>()
    this.allMeetings().forEach((m) => days.add(m.day))
    return DAYS.filter((d) => days.has(d))
  }

  earliestStart(): Minutes | null {
    const starts = this.allMeetings().map((m) => m.time.start)
    return starts.length ? Math.min(...starts) : null
  }

  latestEnd(): Minutes | null {
    const ends = this.allMeetings().map((m) => m.time.end)
    return ends.length ? Math.max(...ends) : null
  }

  /** Meetings grouped by day (week order), each day's list sorted by start time. Days without classes are absent. */
  meetingsByDay(): ReadonlyMap<Day, readonly Meeting[]> {
    if (!this.byDay) {
      const grouped = new Map<Day, Meeting[]>()
      for (const d of DAYS) {
        const list = this.allMeetings().filter((m) => m.day === d)
        if (list.length) grouped.set(d, list.sort((a, b) => a.time.start - b.time.start))
      }
      this.byDay = grouped
    }
    return this.byDay
  }

  /** Sum of idle minutes between consecutive classes on the same day. */
  totalGapMinutes(): number {
    let total = 0
    for (const day of this.meetingsByDay().values()) {
      let runningEnd: Minutes | null = null
      for (const m of day) {
        if (runningEnd !== null && m.time.start > runningEnd) total += m.time.start - runningEnd
        if (runningEnd === null || m.time.end > runningEnd) runningEnd = m.time.end
      }
    }
    return total
  }

  private allMeetings(): Meeting[] {
    return this.sections.flatMap((s) => [...s.meetings])
  }
}

/** A schedule with its 0-100 score and per-strategy sub-scores (0.0-1.0). */
export interface RankedSchedule {
  readonly schedule: Schedule
  readonly score: number
  readonly breakdown: Readonly<Record<string, number>>
}

export { durationMinutes }

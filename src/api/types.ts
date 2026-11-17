export type SemesterCode = '1ST' | '2ND' | 'SUMMER'
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'

export interface Terms { version: string; text: string }
export interface ConsentResponse { consentToken: string; expiresAt: string }
export interface Option { code: string; label: string }

export interface CatalogStatus {
  available: boolean
  source: 'ISMIS' | 'CSV' | 'MOCK' | null
  scrapedAt: string | null
  courseCount: number
  sectionCount: number
  fresh: boolean
}

export interface CourseSummary {
  id: number
  code: string
  name: string
  units: number
  department: string | null
  prerequisites: string | null
}
export interface CoursePage { items: CourseSummary[]; page: number; size: number; total: number }

export interface Meeting { day: DayCode; start: string; end: string; room: string | null; type: 'LECTURE' | 'LAB' }
export interface Section {
  sectionId: number
  courseCode: string
  courseName: string
  units: number
  sectionCode: string
  instructorId: number | null
  instructor: string | null
  availableSlots: number | null
  meetings: Meeting[]
}

export interface HardPrefs {
  maxSchoolDays?: number | null
  maxClassesPerDay?: number | null
  minBreakMinutes?: number | null
  earliestStart?: string | null
  latestEnd?: string | null
  avoidDays?: DayCode[]
  avoidInstructorIds?: number[]
}
export interface SoftPrefs {
  preferMorning?: boolean
  preferAfternoon?: boolean
  minimizeGaps?: boolean
  minimizeDays?: boolean
  prioritizeLunchBreak?: boolean
  preferredInstructorIds?: number[]
}
export interface Preferences { hard: HardPrefs; soft: SoftPrefs }

export interface GenerateRequest {
  courseIds: number[]
  semester: SemesterCode
  academicYear: string
  limit?: number
  preferences?: Preferences
  /** Section ids of a schedule already shown, for "More like this". */
  likeSectionIds?: number[]
}
export interface Stats {
  schoolDays: number
  earliestStart: string | null
  latestEnd: string | null
  totalGapMinutes: number
  totalUnits: number
}
export interface RankedSchedule {
  rank: number
  score: number
  breakdown: Record<string, number>
  stats: Stats
  sections: Section[]
}
export interface GenerateResponse {
  totalUnits: number
  generatedCount: number
  returnedCount: number
  schedules: RankedSchedule[]
}
export interface CompareItem { score: number; breakdown: Record<string, number>; stats: Stats }
export interface CompareResponse { items: CompareItem[] }

export interface AdminStats {
  generatedAt: string
  kpis: {
    students: number; courses: number; sections: number; instructors: number
    activeSessions: number; maxSessions: number
    searchesThisWeek: number; searchesLastWeek: number
    consentsThisWeek: number; consentsLastWeek: number
  }
  searchesByMonth: { month: string; label: string; searches: number; students: number }[]
  topDepartments: { department: string; courses: number }[]
  terms: { semester: string; academicYear: string; searches: number; sections: number }[]
  retention: { rate: number; returning: number; total: number }
  recent: { student: string; semester: string; academicYear: string; courses: number; sections: number; at: string }[]
}

export interface AdminPage<T> { items: T[]; total: number; page: number; size: number }
export interface AdminStudentRow { student: string; courses: number; searches: number; lastActive: string | null }
export interface AdminCourseRow { code: string; name: string; department: string; units: number; students: number }
export interface AdminSearchRow { student: string; semester: string; academicYear: string; source: string; courses: number; sections: number; skipped: number; at: string }
export interface AdminConsentRow { session: string; termsVersion: string; agreedTerms: boolean; agreedCredentialUse: boolean; at: string }
export interface AdminSessionRow { student: string; signedInAt: string; lastUsed: string; expiresAt: string; busy: boolean }

export interface IsmisSession { sessionId: string; expiresAt: string; idleMinutes: number; isAdmin?: boolean }

export type ItemStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'NO_RESULTS' | 'TOO_MANY' | 'FAILED' | 'SKIPPED'
export interface CourseRef { id: number; code: string; name: string; units: number }
export interface SearchItem {
  query: string
  status: ItemStatus
  message: string
  courses: number
  sections: number
  found: CourseRef[]
  /** When the exact code had no match but looked like a "slot" in a family (e.g. "GE-FEL 2"), what
   * ISMIS actually offers under that family (e.g. "GE-FEL"), already in the student's catalog. */
  suggestions: CourseRef[]
  /** What was actually sent to ISMIS, when it differs from what the student typed (a known alias, e.g.
   * "GE-FEL" is searched as "GE-FREELEC"). Null when nothing was rewritten. */
  searchedAs: string | null
}
export interface ProspectusCourse {
  yearLevel: number
  semester: SemesterCode
  code: string
  title: string
  units: number
  requisiteNote: string
}
export interface Prospectus { programName: string; effectiveYear: string | null; courses: ProspectusCourse[] }

export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
export interface SearchStart { jobId: string }
export interface SearchStatus {
  jobId: string
  status: JobStatus
  message: string
  items: SearchItem[]
  error: { code: string; message: string } | null
}

import { create } from 'zustand'
import type { CourseSummary, GenerateResponse, Preferences, SemesterCode } from '../api/types'

function defaultAcademicYear(now = new Date()): string {
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}-${start + 1}`
}

interface TermState {
  semester: SemesterCode
  academicYear: string
  setTerm: (semester: SemesterCode, academicYear: string) => void
}
export const useTermStore = create<TermState>((set) => ({
  semester: '1ST',
  academicYear: defaultAcademicYear(),
  setTerm: (semester, academicYear) => set({ semester, academicYear }),
}))

interface SelectionState {
  selected: CourseSummary[]
  toggle: (course: CourseSummary) => void
  /** Adds courses that are not already selected (used after an ISMIS search). */
  addMany: (courses: CourseSummary[]) => void
  remove: (id: number) => void
  clear: () => void
}
export const useSelectionStore = create<SelectionState>((set) => ({
  selected: [],
  toggle: (course) =>
    set((s) => ({
      selected: s.selected.some((c) => c.id === course.id)
        ? s.selected.filter((c) => c.id !== course.id)
        : [...s.selected, course],
    })),
  addMany: (courses) =>
    set((s) => ({
      selected: [...s.selected, ...courses.filter((c) => !s.selected.some((x) => x.id === c.id))],
    })),
  remove: (id) => set((s) => ({ selected: s.selected.filter((c) => c.id !== id) })),
  clear: () => set({ selected: [] }),
}))

export const emptyPreferences = (): Preferences => ({ hard: { avoidDays: [] }, soft: {} })

interface PreferencesState {
  preferences: Preferences
  setPreferences: (p: Preferences) => void
  reset: () => void
}
export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: emptyPreferences(),
  setPreferences: (preferences) => set({ preferences }),
  reset: () => set({ preferences: emptyPreferences() }),
}))

interface ScheduleState {
  /** What's currently shown: either the original generate results, or a "More like this" set. */
  result: GenerateResponse | null
  /** The original generate results, kept so "Back to all results" can restore them. */
  baseResult: GenerateResponse | null
  /** Rank (within baseResult) of the schedule a "More like this" set is centered on, or null if showing baseResult. */
  showingSimilarTo: number | null
  activeIndex: number
  compareRanks: number[]
  /** Called after a normal "Generate Schedules": replaces both the shown and the original results. */
  setResult: (r: GenerateResponse) => void
  /** Called after "More like this": replaces only the shown results; baseResult is untouched. */
  setSimilarResult: (r: GenerateResponse, referenceRank: number) => void
  /** Restores the original generate results. */
  backToAll: () => void
  setActive: (i: number) => void
  toggleCompare: (rank: number) => void
  reset: () => void
}
export const useScheduleStore = create<ScheduleState>((set, get) => ({
  result: null,
  baseResult: null,
  showingSimilarTo: null,
  activeIndex: 0,
  compareRanks: [],
  setResult: (result) => set({ result, baseResult: result, showingSimilarTo: null, activeIndex: 0, compareRanks: [] }),
  setSimilarResult: (result, referenceRank) =>
    set({ result, showingSimilarTo: referenceRank, activeIndex: 0, compareRanks: [] }),
  backToAll: () => {
    const { baseResult } = get()
    if (baseResult) set({ result: baseResult, showingSimilarTo: null, activeIndex: 0, compareRanks: [] })
  },
  setActive: (activeIndex) => set({ activeIndex }),
  toggleCompare: (rank) =>
    set((s) =>
      s.compareRanks.includes(rank)
        ? { compareRanks: s.compareRanks.filter((r) => r !== rank) }
        : s.compareRanks.length >= 4
          ? s
          : { compareRanks: [...s.compareRanks, rank] },
    ),
  reset: () => set({ result: null, baseResult: null, showingSimilarTo: null, activeIndex: 0, compareRanks: [] }),
}))

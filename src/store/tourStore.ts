import { create } from 'zustand'

const KEY = 'usched.tour.v1'

function seen(): boolean {
  try { return window.localStorage.getItem(KEY) === 'done' } catch { return false }
}
function markSeen() {
  try { window.localStorage.setItem(KEY, 'done') } catch { /* private mode: the tour just shows again next time */ }
}

interface TourState {
  /** False until the browser has been asked whether this tour was already seen (nothing shows before that). */
  ready: boolean
  seen: boolean
  active: boolean
  step: number
  hydrate: () => void
  start: () => void
  next: () => void
  back: () => void
  /** Ends the tour (finished or skipped) and remembers it so it is not offered again. */
  finish: () => void
  /** Stops the tour without remembering anything, e.g. on sign-out. */
  reset: () => void
}

export const useTourStore = create<TourState>((set) => ({
  ready: false,
  seen: true,
  active: false,
  step: 0,
  hydrate: () => set({ ready: true, seen: seen() }),
  start: () => set({ active: true, step: 0 }),
  next: () => set((s) => ({ step: s.step + 1 })),
  back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  finish: () => { markSeen(); set({ active: false, step: 0, seen: true }) },
  reset: () => set({ active: false, step: 0 }),
}))

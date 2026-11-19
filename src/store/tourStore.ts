import { create } from 'zustand'

/** Where the tour is right now. Whether an account has seen it lives on the server (see useTourSeen). */
interface TourState {
  active: boolean
  step: number
  /** The answer to "are you a regular student?"; null until asked. Decides which steps are shown. */
  regular: boolean | null
  start: () => void
  setRegular: (regular: boolean) => void
  next: () => void
  back: () => void
  /** Closes the tour, whether finished or skipped; the caller records it for the account. */
  stop: () => void
}

export const useTourStore = create<TourState>((set) => ({
  active: false,
  step: 0,
  regular: null,
  start: () => set({ active: true, step: 0, regular: null }),
  setRegular: (regular) => set({ regular }),
  next: () => set((s) => ({ step: s.step + 1 })),
  back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => set({ active: false, step: 0, regular: null }),
}))

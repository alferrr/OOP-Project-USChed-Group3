import { create } from 'zustand'

interface IsmisState {
  sessionId: string | null
  idleMinutes: number
  /** Why the session ended, shown once on the sign-in panel (e.g. it timed out). */
  endedReason: string | null
  setSession: (sessionId: string, idleMinutes: number) => void
  end: (reason?: string) => void
}

/** The USChed-side handle for the student's ISMIS session. It is not a credential, and lives in memory only. */
export const useIsmisStore = create<IsmisState>((set) => ({
  sessionId: null,
  idleMinutes: 20,
  endedReason: null,
  setSession: (sessionId, idleMinutes) => set({ sessionId, idleMinutes, endedReason: null }),
  end: (reason) => set({ sessionId: null, endedReason: reason ?? null }),
}))

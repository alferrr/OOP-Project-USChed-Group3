import { create } from 'zustand'

interface IsmisState {
  sessionId: string | null
  idleMinutes: number
  /** Whether this student may open the admin dashboard (the server still checks on every request). */
  isAdmin: boolean
  /** Why the session ended, shown once on the sign-in panel (e.g. it timed out). */
  endedReason: string | null
  setSession: (sessionId: string, idleMinutes: number, isAdmin?: boolean) => void
  end: (reason?: string) => void
}

/** The USChed-side handle for the student's ISMIS session. It is not a credential, and lives in memory only. */
export const useIsmisStore = create<IsmisState>((set) => ({
  sessionId: null,
  idleMinutes: 20,
  isAdmin: false,
  endedReason: null,
  setSession: (sessionId, idleMinutes, isAdmin = false) => set({ sessionId, idleMinutes, isAdmin, endedReason: null }),
  end: (reason) => set({ sessionId: null, isAdmin: false, endedReason: reason ?? null }),
}))

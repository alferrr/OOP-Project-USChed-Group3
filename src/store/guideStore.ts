import { create } from 'zustand'

/** 'new' = never offered, 'active' = quest running, 'hidden' = player put it away, 'done' = all quests complete. */
export type GuideStatus = 'new' | 'active' | 'hidden' | 'done'

const KEY = 'usched.guide.v1'

function load(): GuideStatus {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'active' || v === 'hidden' || v === 'done' ? v : 'new'
  } catch {
    return 'new'
  }
}
function persist(status: GuideStatus) {
  try { window.localStorage.setItem(KEY, status) } catch { /* private mode: the guide just shows again next time */ }
}

interface GuideState {
  status: GuideStatus
  /** Panel expanded (only meaningful while the quest is active or just finished). */
  open: boolean
  /** Quests ticked off this sign-in. Not persisted: it reflects the signed-in student's own data. */
  done: string[]
  /** Last quest just completed, for the +XP toast. */
  toast: { id: string; title: string; xp: number } | null
  hydrate: () => void
  start: () => void
  hide: () => void
  reopen: () => void
  setOpen: (open: boolean) => void
  complete: (id: string, title: string, xp: number) => void
  clearToast: () => void
  finish: () => void
  /** Forget this sign-in's progress (the saved status stays, so the welcome does not repeat). */
  resetProgress: () => void
}

export const useGuideStore = create<GuideState>((set, get) => ({
  status: 'done', // until hydrated on the client, show nothing
  open: false,
  done: [],
  toast: null,
  hydrate: () => set({ status: load() }),
  start: () => { persist('active'); set({ status: 'active', open: true }) },
  hide: () => { persist('hidden'); set({ status: 'hidden', open: false }) },
  reopen: () => { persist('active'); set({ status: 'active', open: true }) },
  setOpen: (open) => set({ open }),
  complete: (id, title, xp) => {
    if (get().done.includes(id)) return
    set((s) => ({ done: [...s.done, id], toast: { id, title, xp } }))
  },
  clearToast: () => set({ toast: null }),
  finish: () => { persist('done'); set({ status: 'done', open: false }) },
  resetProgress: () => set({ done: [], toast: null, open: false }),
}))

import { create } from 'zustand'

interface ConsentState {
  consentToken: string | null
  expiresAt: string | null
  setConsent: (token: string, expiresAt: string) => void
  clear: () => void
}

/**
 * The signed consent token, kept in memory only: a reload or a new tab starts over, so the Terms are
 * shown again before every ISMIS sign-in. ISMIS credentials never go in any store.
 */
export const useConsentStore = create<ConsentState>((set) => ({
  consentToken: null,
  expiresAt: null,
  setConsent: (consentToken, expiresAt) => set({ consentToken, expiresAt }),
  clear: () => set({ consentToken: null, expiresAt: null }),
}))

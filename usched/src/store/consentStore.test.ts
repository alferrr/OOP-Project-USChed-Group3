import { describe, expect, it } from 'vitest'
import { useConsentStore } from './consentStore'
import { useIsmisStore } from './ismisStore'

describe('consent and ISMIS session stores', () => {
  it('are memory-only, so a reload always shows the Terms again', () => {
    localStorage.clear()
    sessionStorage.clear()
    useConsentStore.getState().setConsent('token-abc', '2099-01-01T00:00:00Z')
    useIsmisStore.getState().setSession('session-xyz', 20)
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(stored).not.toContain('token-abc')
    expect(stored).not.toContain('session-xyz')
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })

  it('ending the session remembers why, and signing in clears the reason', () => {
    useIsmisStore.getState().setSession('s', 20)
    useIsmisStore.getState().end('timed out')
    expect(useIsmisStore.getState()).toMatchObject({ sessionId: null, endedReason: 'timed out' })
    useIsmisStore.getState().setSession('s2', 20)
    expect(useIsmisStore.getState().endedReason).toBeNull()
  })
})

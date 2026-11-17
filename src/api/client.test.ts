import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, qs } from './client'
import { useConsentStore } from '../store/consentStore'
import { useIsmisStore } from '../store/ismisStore'
import { useSelectionStore } from '../store/planStore'

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }))
}

describe('api client', () => {
  beforeEach(() => useConsentStore.getState().setConsent('tok-123', new Date(Date.now() + 1e6).toISOString()))
  afterEach(() => vi.unstubAllGlobals())

  it('builds query strings and skips empty values', () => {
    expect(qs({ q: 'cis', page: 0, department: '', x: undefined })).toBe('?q=cis&page=0')
    expect(qs({})).toBe('')
  })

  it('sends the consent token only when asked', async () => {
    respond(200, {})
    await api('/courses')
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers['X-Consent-Token']).toBeUndefined()
    await api('/ismis/sync/1', { consent: true })
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].headers['X-Consent-Token']).toBe('tok-123')
  })

  it('turns error responses into ApiError with code and details', async () => {
    respond(422, { code: 'NO_VALID_SCHEDULE', message: 'No conflict-free schedule exists.', details: ['A conflicts with B'] })
    await expect(api('/schedules/generate', { body: {} })).rejects.toMatchObject({
      name: 'ApiError', status: 422, code: 'NO_VALID_SCHEDULE', details: ['A conflicts with B'],
    })
  })

  it('drops the stored consent when the server says it is required again', async () => {
    respond(403, { code: 'CONSENT_REQUIRED', message: 'The terms have changed.' })
    await expect(api('/ismis/sync', { body: {}, consent: true })).rejects.toBeInstanceOf(ApiError)
    expect(useConsentStore.getState().consentToken).toBeNull()
  })

  it('reports an unreachable server clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    await expect(api('/courses')).rejects.toMatchObject({ code: 'NETWORK' })
  })

  it('sends the ISMIS session id only when asked', async () => {
    useIsmisStore.getState().setSession('sess-9', 20)
    respond(200, {})
    await api('/courses')
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers['X-Ismis-Session']).toBeUndefined()
    await api('/ismis/searches', { body: {}, consent: true, ismis: true })
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].headers['X-Ismis-Session']).toBe('sess-9')
  })

  it('ends the ISMIS session locally when the server says it expired, and clears that student\'s picks too', async () => {
    useIsmisStore.getState().setSession('sess-9', 20)
    useSelectionStore.getState().addMany([{ id: 1, code: 'CIS 2105', name: 'x', units: 3, department: null, prerequisites: null }])
    respond(401, { code: 'ISMIS_SESSION_EXPIRED', message: 'Your ISMIS session has ended.' })
    await expect(api('/ismis/searches', { body: {}, consent: true, ismis: true })).rejects.toBeInstanceOf(ApiError)
    expect(useIsmisStore.getState().sessionId).toBeNull()
    expect(useIsmisStore.getState().endedReason).toMatch(/session ended/i)
    expect(useSelectionStore.getState().selected).toEqual([])
  })

  it('also ends the ISMIS session when consent is required again', async () => {
    useIsmisStore.getState().setSession('sess-9', 20)
    respond(403, { code: 'CONSENT_REQUIRED', message: 'x' })
    await expect(api('/ismis/session', { body: {}, consent: true })).rejects.toBeInstanceOf(ApiError)
    expect(useIsmisStore.getState().sessionId).toBeNull()
  })

  it('accepts an empty 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no body') } }))
    await expect(api<void>('/ismis/session', { method: 'DELETE', consent: true, ismis: true })).resolves.toBeUndefined()
  })
})

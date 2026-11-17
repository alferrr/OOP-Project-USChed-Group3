// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

/**
 * Next.js can bundle route handlers into separate module graphs (and dev hot reload re-evaluates modules), so
 * the same error class may exist twice in one process: a service pinned on globalThis throws copy A while a
 * route checks `instanceof` against copy B. Error identity therefore must not depend on the class object.
 */
describe('error identity across module copies', () => {
  it('recognises an error thrown from another copy of the module', async () => {
    const a = await import('@/server/errors')
    vi.resetModules()
    const b = await import('@/server/errors')
    expect(a.IsmisAuthenticationError).not.toBe(b.IsmisAuthenticationError) // really two copies

    const thrown = new a.IsmisAuthenticationError('nope')
    expect(thrown instanceof b.IsmisAuthenticationError).toBe(true)
    expect(thrown instanceof b.USChedError).toBe(true)
    expect(thrown instanceof b.IsmisSessionExpiredError).toBe(false) // still distinguishes siblings
    expect(new a.InvalidTimeRangeError('x') instanceof b.InvalidCourseDataError).toBe(true) // and subclasses
    expect(new a.InvalidCourseDataError('x') instanceof b.InvalidTimeRangeError).toBe(false)
    expect(new Error('plain') instanceof b.USChedError).toBe(false)
    expect((null as unknown) instanceof b.USChedError).toBe(false)
  })

  it('maps a foreign-copy error to its own status and code, not a 500', async () => {
    const a = await import('@/server/errors')
    vi.resetModules()
    const { toErrorResponse } = await import('@/server/http/api')
    const res = toErrorResponse(new a.IsmisAuthenticationError('ISMIS rejected the credentials.'))
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('ISMIS_AUTH_FAILED')
  })
})

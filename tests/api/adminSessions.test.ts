import { describe, expect, it } from 'vitest'
import { listSessions } from '@/server/services/adminLists'
import { ismisSessions } from '@/server/services/ismisSessions'

describe('admin sessions list', () => {
  it('lists signed-in students by ID number, even when the pinned instance predates overview()', () => {
    const service = ismisSessions()
    service.seedTestSession('19020241')
    // Simulate a hot-reloaded dev server: an instance from an older class that has no overview().
    const stale = Object.create(Object.getPrototypeOf(service)) as Record<string, unknown>
    Object.assign(stale, service)
    const proto = Object.create(null)
    Object.setPrototypeOf(stale, proto)
    ;(globalThis as Record<string, unknown>).__usched_ismisSessions = stale
    const page = listSessions(0)
    expect(page.items.some((r) => r.student === '19020241')).toBe(true)
    ;(globalThis as Record<string, unknown>).__usched_ismisSessions = service
    service.shutdown()
  })
})

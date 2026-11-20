import { prisma } from '../db'
import { IsmisAuthenticationError, IsmisChallengeError, IsmisLayoutChangedError, IsmisUnavailableError } from '../errors'

export type IsmisFailureKind = 'AUTH_FAILED' | 'CHALLENGE' | 'LAYOUT_CHANGED' | 'UNAVAILABLE'
export type HealthStatus = 'healthy' | 'degraded' | 'broken'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Which kind of ISMIS failure an error is, or null for anything else (no results, too many, our own bugs). */
export function failureKind(e: unknown): IsmisFailureKind | null {
  if (e instanceof IsmisLayoutChangedError) return 'LAYOUT_CHANGED'
  if (e instanceof IsmisChallengeError) return 'CHALLENGE'
  if (e instanceof IsmisUnavailableError) return 'UNAVAILABLE'
  if (e instanceof IsmisAuthenticationError) return 'AUTH_FAILED'
  return null
}

/** Notes a failure reading ISMIS. Fire and forget: health bookkeeping must never break a student's request. */
export function recordIsmisFailure(e: unknown): void {
  const kind = failureKind(e)
  if (!kind) return
  void prisma.ismisEvent.create({ data: { kind } }).catch(() => {})
}

/**
 * - broken:   ISMIS's pages changed shape in the last 24 hours, so reading them probably does not work.
 * - degraded: three or more "unreachable" or CAPTCHA failures in the last hour.
 * Wrong passwords are the student's own mistake and never count against ISMIS.
 */
export function healthStatus(events: { kind: string; occurredAt: Date }[], now = new Date()): HealthStatus {
  const t = now.getTime()
  if (events.some((e) => e.kind === 'LAYOUT_CHANGED' && t - e.occurredAt.getTime() < DAY)) return 'broken'
  const lately = events.filter((e) => (e.kind === 'UNAVAILABLE' || e.kind === 'CHALLENGE') && t - e.occurredAt.getTime() < HOUR)
  return lately.length >= 3 ? 'degraded' : 'healthy'
}

export interface IsmisHealth {
  status: HealthStatus
  /** Failure counts by kind. */
  last24h: Record<IsmisFailureKind, number>
  last7d: Record<IsmisFailureKind, number>
  lastFailure: { kind: string; at: string } | null
  lastSuccessfulSearch: string | null
}

const empty = (): Record<IsmisFailureKind, number> => ({ AUTH_FAILED: 0, CHALLENGE: 0, LAYOUT_CHANGED: 0, UNAVAILABLE: 0 })

export async function ismisHealth(now = new Date()): Promise<IsmisHealth> {
  const week = new Date(now.getTime() - 7 * DAY)
  const [events, lastOk] = await Promise.all([
    prisma.ismisEvent.findMany({ where: { occurredAt: { gte: week } }, orderBy: { occurredAt: 'desc' } }),
    prisma.catalogSnapshot.findFirst({ where: { source: 'ISMIS' }, orderBy: { scrapedAt: 'desc' } }),
  ])
  const last24h = empty()
  const last7d = empty()
  for (const e of events) {
    const k = e.kind as IsmisFailureKind
    if (!(k in last7d)) continue
    last7d[k]++
    if (now.getTime() - e.occurredAt.getTime() < DAY) last24h[k]++
  }
  return {
    status: healthStatus(events, now),
    last24h,
    last7d,
    lastFailure: events[0] ? { kind: events[0].kind, at: events[0].occurredAt.toISOString() } : null,
    lastSuccessfulSearch: lastOk ? lastOk.scrapedAt.toISOString() : null,
  }
}

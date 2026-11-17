/**
 * Stateful services (sessions, search jobs) must exist exactly once per Node process. Next.js can bundle
 * route handlers into separate module graphs and re-evaluates modules on dev hot reload, so a plain
 * module-level `new X()` could silently give two handlers two different session tables. Pinning on globalThis
 * guarantees one. This is also why USChed must run as a single long-lived server process (PM2 fork mode,
 * one instance), not in serverless functions or cluster mode.
 */
export function singleton<T>(key: string, create: () => T): T {
  const g = globalThis as unknown as Record<string, unknown>
  const k = `__usched_${key}`
  return (g[k] ??= create()) as T
}

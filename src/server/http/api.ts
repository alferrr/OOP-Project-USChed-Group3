import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { getConfig, isAdminStudent } from '../config'
import { AdminForbiddenError, InvalidCourseDataError, NoValidScheduleError, USChedError } from '../errors'
import { verifyConsent } from '../services/consent'
import { ismisSessions } from '../services/ismisSessions'

export const SESSION_HEADER = 'X-Ismis-Session'
export const CONSENT_HEADER = 'X-Consent-Token'
export const ADMIN_HEADER = 'X-Admin-Token'

/** A request the client got wrong in a way that is not worth a specific message. */
export class BadRequestError extends Error {}

export interface Ctx {
  req: NextRequest
  /** Dynamic path segments, already awaited. */
  params: Record<string, string>
  /** Set when the route is student-scoped: the ISMIS ID number of the signed-in student. */
  studentIdNumber: string
  sessionId: string | null
}

export interface RouteOptions {
  /**
   * ismis:   /api/ismis/**       - HTTPS-only when required, never cached, consent token required.
   * student: private catalog     - a live ISMIS session id (X-Ismis-Session) identifies the student.
   * admin:   /api/admin/**       - shared X-Admin-Token.
   * adminSession: the dashboard - a live ISMIS session whose ID number is on the admin list.
   * open:    anything else.
   */
  guard?: 'ismis' | 'student' | 'admin' | 'adminSession' | 'open'
}

type Handler = (ctx: Ctx) => Promise<Response | object | undefined | void>

/**
 * The route-level equivalent of the old servlet filter chain, in the same order: HTTPS enforcement, sensitive
 * response headers, consent gate, student identity, admin token. Then the handler, then one error mapper so
 * every failure has the same { code, message, details } shape and nothing sensitive can leak into it.
 */
export function route(options: RouteOptions, handler: Handler) {
  const guard = options.guard ?? 'open'
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }): Promise<Response> => {
    const secure = isSecure(req)
    const finish = (res: Response): Response => {
      if (secure) res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      if (guard === 'ismis') {
        res.headers.set('Cache-Control', 'no-store')
        res.headers.set('Pragma', 'no-cache')
      }
      return res
    }
    try {
      if (!secure && getConfig().requireHttps && guard === 'ismis') {
        return finish(errorResponse(403, 'HTTPS_REQUIRED', 'This endpoint is only available over HTTPS.'))
      }
      if (guard === 'ismis') verifyConsent(req.headers.get(CONSENT_HEADER))
      if (guard === 'admin') {
        const denied = checkAdmin(req)
        if (denied) return finish(denied)
      }
      const sessionId = req.headers.get(SESSION_HEADER)
      const studentIdNumber = guard === 'student' || guard === 'adminSession' ? ismisSessions().identify(sessionId) : ''
      if (guard === 'adminSession' && !isAdminStudent(studentIdNumber)) throw new AdminForbiddenError()
      const out = await handler({ req, params: await context.params, studentIdNumber, sessionId })
      if (out instanceof Response) return finish(out)
      return finish(out === undefined ? new NextResponse(null, { status: 204 }) : NextResponse.json(out))
    } catch (e) {
      return finish(toErrorResponse(e))
    }
  }
}

export function json(body: unknown, status = 200): Response {
  return NextResponse.json(body, { status })
}

export function noContent(): Response {
  return new NextResponse(null, { status: 204 })
}

function isSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === 'https:' || (req.headers.get('x-forwarded-proto') ?? '').split(',')[0].trim().toLowerCase() === 'https'
}

/** Minimal admin protection: a shared token; a blank token disables the endpoints. */
function checkAdmin(req: NextRequest): Response | null {
  const expected = getConfig().admin.token
  if (!expected || !expected.trim()) return errorResponse(403, 'ADMIN_DISABLED', 'Admin endpoints are disabled on this server.')
  const given = req.headers.get(ADMIN_HEADER)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(given ?? '', 'utf8')
  if (given === null || a.length !== b.length || !timingSafeEqual(a, b)) {
    return errorResponse(401, 'ADMIN_UNAUTHORIZED', 'Missing or invalid admin token.')
  }
  return null
}

export function errorResponse(status: number, code: string, message: string, details: string[] = []): Response {
  const res = NextResponse.json({ code, message, details }, { status })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/**
 * Maps each exception type to its own status and code. Messages for unexpected errors are generic and
 * request bodies are never echoed, so nothing sensitive (e.g. an ISMIS password) can leak into a response.
 */
export function toErrorResponse(e: unknown): Response {
  if (e instanceof USChedError) {
    const details = e instanceof NoValidScheduleError ? e.details : []
    const message = e.status >= 500 && e.status !== 502 ? 'Something went wrong.' : e.message
    return errorResponse(e.status, e.code, message, details)
  }
  if (e instanceof ZodError) {
    const details = e.issues.map((i) => `${i.path.join('.') || 'body'} ${i.message}`)
    return errorResponse(400, 'VALIDATION_ERROR', 'The request is not valid.', details)
  }
  if (e instanceof BadRequestError || e instanceof SyntaxError) {
    return errorResponse(400, 'BAD_REQUEST', 'The request could not be read.')
  }
  // Deliberately only the error's type: messages and stacks can carry request data (e.g. a password).
  // oxlint-disable-next-line no-console
  console.error('Unhandled error:', e instanceof Error ? e.constructor.name : typeof e)
  return errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong.')
}

// ---- Request parsing --------------------------------------------------------------------------------------

/** Parses and validates a JSON body. A malformed body is BAD_REQUEST; a well-formed but invalid one is VALIDATION_ERROR. */
export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new BadRequestError()
  }
  return schema.parse(raw)
}

export const query = {
  required(req: NextRequest, name: string): string {
    const v = req.nextUrl.searchParams.get(name)
    if (v === null) throw new BadRequestError()
    return v
  },
  optional(req: NextRequest, name: string): string | null {
    return req.nextUrl.searchParams.get(name)
  },
  int(req: NextRequest, name: string, fallback: number): number {
    const v = req.nextUrl.searchParams.get(name)
    if (v === null || v === '') return fallback
    return toInt(v)
  },
}

export function toInt(v: string): number {
  if (!/^-?\d+$/.test(v.trim())) throw new BadRequestError()
  return Number(v)
}

/** Best-effort client address for the hashed consent evidence (a reverse proxy sets X-Forwarded-For). */
export function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : (req.headers.get('x-real-ip') ?? null)
}

export { InvalidCourseDataError }

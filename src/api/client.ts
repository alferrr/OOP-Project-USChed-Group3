import { clearStudentData } from '../store/resetAll'
import { useConsentStore } from '../store/consentStore'
import { useIsmisStore } from '../store/ismisStore'

export class ApiError extends Error {
  status: number
  code: string
  details: string[]

  constructor(status: number, code: string, message: string, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface Options {
  method?: string
  body?: unknown
  /** Attach the signed consent token (required for /ismis/**). */
  consent?: boolean
  /** Also attach the student's ISMIS session id. */
  ismis?: boolean
  signal?: AbortSignal
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.consent) {
    const token = useConsentStore.getState().consentToken
    if (token) headers['X-Consent-Token'] = token
  }

  if (opts.ismis) {
    const id = useIsmisStore.getState().sessionId
    if (id) headers['X-Ismis-Session'] = id
  }

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the USChed server.')
  }

  if (!res.ok) {
    let code = 'HTTP_' + res.status
    let message = 'Something went wrong.'
    let details: string[] = []
    try {
      const j = await res.json()
      code = j.code ?? code
      message = j.message ?? message
      details = j.details ?? []
    } catch {
      // Non-JSON error body: keep the defaults.
    }
    if (code === 'CONSENT_REQUIRED') {
      useConsentStore.getState().clear()
      useIsmisStore.getState().end('Please review the Terms and sign in again.')
      clearStudentData() // nothing student-scoped may linger past the moment the session is known to be gone
    }
    if (code === 'ISMIS_SESSION_EXPIRED') {
      useIsmisStore.getState().end('Your ISMIS session ended. Please sign in again.')
      clearStudentData()
    }
    throw new ApiError(res.status, code, message, details)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

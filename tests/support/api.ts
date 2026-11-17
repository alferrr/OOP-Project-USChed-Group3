import { NextRequest } from 'next/server'

type RouteHandler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>

export interface Reply {
  status: number
  headers: Headers
  text: string
  /** Parsed JSON body, or null when there is none. */
  json: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface CallOptions {
  headers?: Record<string, string>
  /** Sent as an application/json body (a string is sent verbatim, to test malformed bodies). */
  json?: unknown
  form?: FormData
  params?: Record<string, string>
}

/** Invokes a route handler exactly as Next.js would, without a server. */
export async function call(handler: RouteHandler, method: string, path: string, opts: CallOptions = {}): Promise<Reply> {
  const headers: Record<string, string> = { ...opts.headers }
  let body: BodyInit | undefined
  if (opts.json !== undefined) {
    headers['content-type'] = 'application/json'
    body = typeof opts.json === 'string' ? opts.json : JSON.stringify(opts.json)
  } else if (opts.form) {
    body = opts.form
  }
  const req = new NextRequest(`http://localhost${path}`, { method, headers, body })
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: res.status, headers: res.headers, text, json }
}

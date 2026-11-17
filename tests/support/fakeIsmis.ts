import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { loadConfig, type IsmisConfig } from '@/server/config'

export type Mode = 'NORMAL' | 'CAPTCHA' | 'LAYOUT_CHANGED' | 'DOWN' | 'SLOW' | 'EVIL_ACTION' | 'FILTER_VIA_AJAX'

const FIXTURES = join(__dirname, '..', 'fixtures')
export const fixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8')

const CAPTCHA = '<div class="g-recaptcha" data-sitekey="x"></div>'

/** A local stand-in for ISMIS serving fixture HTML. Automated tests never touch the real ISMIS. */
export class FakeIsmis {
  mode: Mode = 'NORMAL'
  acceptedPassword = 'correct-horse'
  private epoch = 1
  private readonly hitLog: string[] = []
  private readonly bodyLog: string[] = []
  private readonly server: Server

  private constructor() {
    this.server = createServer((req, res) => void this.handle(req, res))
  }

  static async start(): Promise<FakeIsmis> {
    const f = new FakeIsmis()
    await new Promise<void>((resolve) => f.server.listen(0, '127.0.0.1', resolve))
    return f
  }

  baseUrl(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`
  }

  /** Invalidates every signed-in session, like ISMIS timing users out. */
  expireSessions() {
    this.epoch++
  }

  hits(): string[] {
    return [...this.hitLog]
  }

  bodies(): string[] {
    return [...this.bodyLog]
  }

  loginPosts(): number {
    return this.hitLog.filter((h) => h === 'POST /login').length
  }

  reset() {
    this.mode = 'NORMAL'
    this.acceptedPassword = 'correct-horse'
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()))
  }

  /** An IsmisConfig pointing at this server (no throttling, short allowlist). */
  config(overrides: Partial<IsmisConfig> = {}): IsmisConfig {
    return {
      ...loadConfig({}).ismis,
      baseUrl: this.baseUrl(),
      loginPath: '/login',
      offeredCoursesPath: '/offered',
      searchPath: '/search',
      logoutPath: '/logout',
      prospectusPath: '/prospectus',
      usernameField: 'user',
      passwordField: 'pass',
      minDelayMs: 0,
      allowedPathPrefixes: ['/home', '/CourseSchedule/OfferedCoursesFilter'],
      ...overrides,
    }
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://x')
    this.hitLog.push(`${req.method} ${url.pathname}${url.search}`)
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = Buffer.concat(chunks).toString('utf8')
    if (body) this.bodyLog.push(body)

    if (this.mode === 'DOWN') return send(res, 503, 'down')
    switch (url.pathname) {
      case '/login':
        return this.login(req, res, body)
      case '/offered':
        return await this.offered(req, res)
      case '/search':
        return this.search(req, res, req.method === 'GET' ? parse(url.search.slice(1)) : parse(body))
      case '/CourseSchedule/OfferedCoursesFilter':
        return this.filterPartial(req, res)
      case '/prospectus':
        return this.prospectus(req, res)
      case '/logout':
        return send(res, 200, 'bye')
      case '/home':
        return send(res, 200, '<html><body>home</body></html>')
      default:
        return send(res, 404, 'not found')
    }
  }

  private login(req: IncomingMessage, res: ServerResponse, body: string) {
    if (req.method === 'POST') {
      const form = parse(body)
      if (this.mode !== 'CAPTCHA' && form.pass === this.acceptedPassword && form.__RequestVerificationToken === 'tok-123') {
        return send(res, 302, '', { 'Set-Cookie': `sid=ok-${this.epoch}; Path=/`, Location: '/home' })
      }
    }
    send(
      res,
      200,
      '<html><body><form method="post" action="/login">' +
        '<input type="hidden" name="__RequestVerificationToken" value="tok-123"/>' +
        '<input name="user"/><input type="password" name="pass"/></form>' +
        (this.mode === 'CAPTCHA' ? CAPTCHA : '') +
        '</body></html>',
    )
  }

  private loggedIn(req: IncomingMessage): boolean {
    return (req.headers.cookie ?? '').split(';').some((p) => p.trim() === `sid=ok-${this.epoch}`)
  }

  /** The search page: the real form (fixture) with a fresh token. */
  private async offered(req: IncomingMessage, res: ServerResponse) {
    if (!this.loggedIn(req)) return send(res, 302, '', { Location: '/login' })
    if (this.mode === 'SLOW') await new Promise((r) => setTimeout(r, 600))
    if (this.mode === 'LAYOUT_CHANGED') return send(res, 200, '<html><body><div>We redesigned everything</div></body></html>')
    if (this.mode === 'FILTER_VIA_AJAX') {
      return send(
        res,
        200,
        '<html><body><a class="rs-ajax green" data-ajax-targetid="OfferedCourseFilter" ' +
          'href="/CourseSchedule/OfferedCoursesFilter">set term</a><div id="OfferedCourseFilter"></div></body></html>',
      )
    }
    send(res, 200, this.searchFormHtml())
  }

  private searchFormHtml(): string {
    return fixture('search-form.html')
      .replaceAll('SANITIZED-TOKEN', 'srch-456')
      .replace('/CourseSchedule/CourseScheduleOffered?Length=14', this.mode === 'EVIL_ACTION' ? '/enroll' : '/search?Length=14')
  }

  /** The filter partial the real page loads by AJAX: only returned when asked the way its own script asks. */
  private filterPartial(req: IncomingMessage, res: ServerResponse) {
    const ajax = req.headers['x-requested-with'] === 'XMLHttpRequest'
    send(res, 200, this.loggedIn(req) && ajax ? this.searchFormHtml() : '<html><body>full page, no form</body></html>')
  }

  /**
   * The term search. Page 1 needs the session, the anti-forgery token, and the right term values; page 2+
   * (a GET, since that is how ISMIS's own pagination links work) is checked the same way except the token.
   */
  private search(req: IncomingMessage, res: ServerResponse, form: Record<string, string>) {
    const isPost = req.method === 'POST'
    const tokenOk = !isPost || form.__RequestVerificationToken === 'srch-456'
    const ok = this.loggedIn(req) && tokenOk && form.AcademicPeriod === 'FIRST_SEMESTER' && form.AcademicYear === '2026'
    if (!ok) return send(res, 200, '<div>No results</div>')

    const query = (form.Courses ?? '').toLowerCase()
    if (query === 'ge-fel') return send(res, 200, fixture('offered-gefel.html'))
    if (query === 'many') {
      const file = { '2': 'offered-paged-p2.html', '3': 'offered-paged-p3.html' }[form.page ?? '1'] ?? 'offered-paged-p1.html'
      return send(res, 200, fixture(file))
    }
    // "shortnomatch" mimics the real ISMIS shape for a genuinely empty search: a short ajax fragment with no
    // table at all, as opposed to "nomatch" below: a full results table with a header and no data rows.
    if (query === 'shortnomatch') return send(res, 200, '<div class="row" id="CourseScheduleOfferedList"></div>')
    let results = fixture('offered.html')
    if (query === 'nomatch') results = results.replace(/<tbody>[\s\S]*?<\/tbody>/, '<tbody><tr><td colspan="100"></td></tr></tbody>')
    send(res, 200, results)
  }

  /** The student's degree-program curriculum: a fixed page, same for every request once signed in. */
  private prospectus(req: IncomingMessage, res: ServerResponse) {
    if (!this.loggedIn(req)) return send(res, 302, '', { Location: '/login' })
    if (this.mode === 'LAYOUT_CHANGED') return send(res, 200, '<html><body><div>We redesigned everything</div></body></html>')
    send(res, 200, fixture('prospectus.html'))
  }
}

function send(res: ServerResponse, status: number, body: string, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers })
  res.end(body)
}

function parse(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of body.split('&')) {
    if (!pair) continue
    const [k, v = ''] = pair.split('=')
    out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '))
  }
  return out
}

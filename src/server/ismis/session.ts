import * as cheerio from 'cheerio'
import type { IsmisConfig } from '../config'
import { IsmisChallengeError, IsmisUnavailableError, ScraperError } from '../errors'

const MAX_REDIRECTS = 5

interface Reply {
  status: number
  body: string
  location: string | null
}

/**
 * Owns the cookies for one signed-in ISMIS visit. Strictly read-only: every request is a GET to an
 * allowlisted path, except the single login POST and the read-only term-search POST. Redirects are followed
 * manually and held to the same rules. Nothing here logs URLs, bodies or cookies.
 */
export class IsmisSession {
  private readonly base: URL
  private readonly cookies = new Map<string, string>()
  private lastRequestAt = 0

  constructor(private readonly config: IsmisConfig) {
    this.base = new URL(config.baseUrl)
  }

  /** The one write-like call permitted: posting the sign-in form to the login path. */
  async postLogin(form: Record<string, string>, signal?: AbortSignal): Promise<string> {
    return (await this.request('POST', this.config.loginPath, formBody(form), false, signal)).body
  }

  /**
   * The second permitted POST: the read-only term search. Only the configured search path is accepted,
   * whatever the page's form claims as its action.
   */
  async postSearch(actionPathAndQuery: string, form: Record<string, string>, signal?: AbortSignal): Promise<string> {
    return (await this.request('POST', actionPathAndQuery, formBody(form), false, signal)).body
  }

  get(pathAndQuery: string, signal?: AbortSignal): Promise<string> {
    return this.follow(pathAndQuery, false, signal)
  }

  /** GET as the page's own JavaScript would (X-Requested-With), used for partials the page loads by AJAX. */
  getAjax(pathAndQuery: string, signal?: AbortSignal): Promise<string> {
    return this.follow(pathAndQuery, true, signal)
  }

  private async follow(pathAndQuery: string, ajax: boolean, signal?: AbortSignal): Promise<string> {
    let path = pathAndQuery
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await this.request('GET', path, null, ajax, signal)
      if (res.status >= 300 && res.status < 400) {
        if (!res.location) throw new IsmisUnavailableError('ISMIS sent an invalid redirect.')
        const target = new URL(res.location, new URL(path, this.base))
        path = this.toLocalPath(target)
        continue
      }
      return res.body
    }
    throw new IsmisUnavailableError('ISMIS redirected too many times.')
  }

  /** All traffic funnels through here so the read-only rules are enforced exactly once. */
  async request(
    method: 'GET' | 'POST',
    pathAndQuery: string,
    body: string | null,
    ajax = false,
    signal?: AbortSignal,
  ): Promise<Reply> {
    const uri = new URL(pathAndQuery, this.base)
    if (!this.sameHost(uri)) throw new ScraperError('Blocked: request leaves the configured ISMIS host.')

    const path = uri.pathname
    const isLoginPost = method === 'POST' && eq(path, this.config.loginPath)
    const isSearchPost = method === 'POST' && !!this.config.searchPath && eq(path, this.config.searchPath)
    if (!(method === 'GET' || isLoginPost || isSearchPost)) {
      throw new ScraperError('Blocked: only GET, the login POST and the term search POST are permitted.')
    }
    if (!this.isAllowedPath(path)) throw new ScraperError('Blocked: path is not on the read-only allowlist.')

    await this.pause(signal)

    const headers: Record<string, string> = { 'User-Agent': this.config.userAgent }
    const cookie = this.cookieHeader()
    if (cookie) headers.Cookie = cookie
    if (isLoginPost || isSearchPost) headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if (isSearchPost || ajax) headers['X-Requested-With'] = 'XMLHttpRequest'

    const timeout = AbortSignal.timeout(this.config.requestTimeoutSeconds * 1000)
    let res: Response
    try {
      res = await fetch(uri, {
        method,
        headers,
        body: isLoginPost || isSearchPost ? body : undefined,
        redirect: 'manual',
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      })
    } catch {
      throw new IsmisUnavailableError('Could not reach ISMIS.')
    }
    this.storeCookies(res.headers.getSetCookie())
    if (res.status >= 500) throw new IsmisUnavailableError('ISMIS is not responding correctly.')

    let text: string
    try {
      text = await res.text()
    } catch {
      throw new IsmisUnavailableError('Could not reach ISMIS.')
    }
    rejectChallenge(text)
    return { status: res.status, body: text, location: res.headers.get('location') }
  }

  private isAllowedPath(path: string): boolean {
    const p = path.toLowerCase()
    const c = this.config
    if (
      p === c.loginPath.toLowerCase() ||
      p.startsWith(c.offeredCoursesPath.toLowerCase()) ||
      (!!c.searchPath && p === c.searchPath.toLowerCase())
    ) {
      return true
    }
    if (c.logoutPath && p === c.logoutPath.toLowerCase()) return true
    if (c.prospectusPath && p === c.prospectusPath.toLowerCase()) return true
    return c.allowedPathPrefixes.some((a) => p.startsWith(a.toLowerCase()))
  }

  private sameHost(uri: URL): boolean {
    return uri.hostname.toLowerCase() === this.base.hostname.toLowerCase() && uri.port === this.base.port
  }

  private toLocalPath(target: URL): string {
    if (!this.sameHost(target)) throw new ScraperError('Blocked: redirect leaves the configured ISMIS host.')
    return target.pathname + target.search
  }

  /** Name=value cookies for the one configured host; Max-Age=0 / past Expires / empty values delete. */
  private storeCookies(setCookies: string[]) {
    for (const raw of setCookies) {
      const parts = raw.split(';').map((s) => s.trim())
      const eqAt = parts[0].indexOf('=')
      if (eqAt < 1) continue
      const name = parts[0].slice(0, eqAt)
      const value = parts[0].slice(eqAt + 1)
      let expired = value === ''
      for (const attr of parts.slice(1)) {
        const [k, v = ''] = attr.split('=')
        if (/^max-age$/i.test(k) && Number(v) <= 0) expired = true
        if (/^expires$/i.test(k) && !Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now()) expired = true
      }
      if (expired) this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
  }

  private cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  private async pause(signal?: AbortSignal) {
    const wait = this.config.minDelayMs - (Date.now() - this.lastRequestAt)
    if (this.lastRequestAt !== 0 && wait > 0) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, wait)
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(t)
            reject(new IsmisUnavailableError('The ISMIS request was interrupted.'))
          },
          { once: true },
        )
      })
    }
    this.lastRequestAt = Date.now()
  }

  close() {
    this.cookies.clear()
  }
}

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const formBody = (form: Record<string, string>) =>
  Object.entries(form)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

const CHALLENGE_INPUT = /(captcha|^otp|totp|verification[_-]?code|two[_-]?factor)/i

/** Stop, never solve: a CAPTCHA or one-time-code page ends the scrape. */
export function rejectChallenge(html: string | null | undefined) {
  if (!html) return
  const $ = cheerio.load(html)
  let challenge =
    $('.g-recaptcha, .h-captcha, [data-sitekey], iframe[src*=captcha]').length > 0 ||
    $('input[name]')
      .toArray()
      .some((el) => CHALLENGE_INPUT.test($(el).attr('name') ?? ''))
  if (!challenge) challenge = $.root().text().toLowerCase().includes('verification code')
  if (challenge) throw new IsmisChallengeError('ISMIS asked for a CAPTCHA or verification code.')
}

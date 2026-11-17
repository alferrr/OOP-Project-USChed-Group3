import * as cheerio from 'cheerio'
import { ismisConfigured, type IsmisConfig } from '../config'
import type { Course, Semester } from '../domain/model'
import {
  IsmisAuthenticationError,
  IsmisLayoutChangedError,
  IsmisNoResultsError,
  IsmisNotConfiguredError,
  IsmisSessionExpiredError,
} from '../errors'
import { mapIsmisRows } from './courseMapper'
import {
  describeStructure,
  formAction,
  formFields,
  linkHref,
  loginFormHiddenFields,
  pageInfo,
  parseProspectus,
  parseResults,
  type Prospectus,
} from './parser'
import { IsmisSession } from './session'

export interface SearchResult {
  courses: Course[]
  skipped: string[]
}

/**
 * A signed-in ISMIS session that can run several read-only course searches. It holds cookies only:
 * the credentials are read once, during signIn, and are never kept here. The caller decides how long the
 * connection lives and must close it (which also logs out, best effort).
 */
export class IsmisConnection {
  private closed = false
  private prospectusCache: Promise<Prospectus> | null = null
  /** Searches on one connection run strictly one after another, like ISMIS itself expects. */
  private queue: Promise<unknown> = Promise.resolve()

  private constructor(
    private readonly config: IsmisConfig,
    private readonly session: IsmisSession,
  ) {}

  /**
   * Signs in and verifies the session works. The password is only referenced inside this call; JavaScript
   * strings cannot be zeroed, so what we guarantee is that nothing retains it past the login POST.
   */
  static async signIn(config: IsmisConfig, username: string, password: string, signal?: AbortSignal): Promise<IsmisConnection> {
    if (!ismisConfigured(config)) throw new IsmisNotConfiguredError('Live ISMIS sync is not set up on this server yet.')
    const c = new IsmisConnection(config, new IsmisSession(config))
    try {
      await c.login(username, password, signal)
      await c.openSearchPage(true, signal) // proves the credentials worked before we report success
      return c
    } catch (e) {
      await c.close()
      throw e
    }
  }

  /** ISMIS's offered-courses table has no units column, so callers must not trust the units in results. */
  providesUnits(): boolean {
    return false
  }

  /**
   * The student's own degree-program curriculum (not what is offered this term). Fetched once per
   * connection and cached, since it does not change while the student is signed in.
   */
  prospectus(signal?: AbortSignal): Promise<Prospectus> {
    if (this.closed) return Promise.reject(new IsmisSessionExpiredError('The ISMIS session has ended. Please sign in again.'))
    if (!this.prospectusCache) {
      if (!this.config.prospectusPath.trim()) {
        return Promise.reject(new IsmisNotConfiguredError('The ISMIS prospectus page is not set up on this server yet.'))
      }
      const loading = this.serialise(async () => {
        const html = await this.session.get(this.config.prospectusPath, signal)
        if (this.showsSignInForm(html)) throw new IsmisSessionExpiredError('Your ISMIS session has ended. Please sign in again.')
        return parseProspectus(html)
      })
      this.prospectusCache = loading
      // A failed attempt must not be cached: the next call should try again.
      loading.catch(() => {
        if (this.prospectusCache === loading) this.prospectusCache = null
      })
    }
    return this.prospectusCache
  }

  /** Runs one term search (read-only) and returns the validated courses. */
  search(semester: Semester, academicYear: string, query: string, signal?: AbortSignal): Promise<SearchResult> {
    return this.serialise(() => this.searchNow(semester, academicYear, query, signal))
  }

  private async searchNow(semester: Semester, academicYear: string, query: string, signal?: AbortSignal): Promise<SearchResult> {
    if (this.closed) throw new IsmisSessionExpiredError('The ISMIS session has ended. Please sign in again.')
    const cfg = this.config
    const index = await this.openSearchPage(false, signal)
    let formHtml = index
    let form = formFields(formHtml, cfg.searchFormSelector)
    if (Object.keys(form).length === 0) {
      // The page may load its filter form by AJAX; follow the link it uses, as its own script would.
      const filterLink = linkHref(index, 'a[href*=OfferedCoursesFilter]')
      if (filterLink) {
        formHtml = await this.session.getAjax(filterLink, signal)
        form = formFields(formHtml, cfg.searchFormSelector)
      }
    }
    const action = formAction(formHtml, cfg.searchFormSelector)
    if (Object.keys(form).length === 0 || !action) {
      throw new IsmisLayoutChangedError(`The term search form was not found on the ISMIS page (${describeStructure(formHtml)}).`)
    }
    form[cfg.academicPeriodField] = academicPeriod(semester)
    form[cfg.academicYearField] = startYear(academicYear)
    form[cfg.coursesField] = query

    const html = await this.session.postSearch(action, form, signal)
    if (this.showsSignInForm(html)) throw new IsmisSessionExpiredError('Your ISMIS session has ended. Please sign in again.')

    let all
    try {
      all = [...parseResults(html)]
    } catch (e) {
      if (e instanceof IsmisLayoutChangedError) {
        throw new IsmisLayoutChangedError(`${e.message} (${describeStructure(html)})`)
      }
      throw e
    }
    if (all.length === 0) throw new IsmisNoResultsError(`ISMIS has no courses matching "${query}" for this term.`)

    const notes: string[] = []
    const [, totalPages] = pageInfo(html)
    if (totalPages > 1) {
      const fetchThrough = Math.min(totalPages, cfg.maxPages)
      for (let p = 2; p <= fetchThrough; p++) {
        all.push(...parseResults(await this.session.get(this.pageUrl(semester, academicYear, query, p), signal)))
      }
      if (fetchThrough < totalPages) {
        notes.push(
          `Only pages 1-${fetchThrough} of ${totalPages} were fetched; results may be incomplete. Search a more specific code to see the rest.`,
        )
      }
    }

    const mapped = mapIsmisRows(all, semester, academicYear, cfg.defaultCampus, cfg.defaultUnits)
    if (mapped.courses.length === 0) throw new IsmisLayoutChangedError('No usable courses were found on the ISMIS page.')
    return { courses: mapped.courses, skipped: [...mapped.skipped, ...notes] }
  }

  /**
   * Page 2+ of the same search, built from our own field names and values rather than a scraped href:
   * ISMIS's pagination widget only shows a window of nearby page numbers (plus first/last), so most pages
   * have no visible link to follow. The GET form of the same action recognises the same field names as the
   * search POST, per ASP.NET MVC model binding.
   */
  private pageUrl(semester: Semester, academicYear: string, query: string, page: number): string {
    const c = this.config
    return (
      `${c.searchPath}?${enc(c.academicPeriodField)}=${enc(academicPeriod(semester))}` +
      `&${enc(c.academicYearField)}=${enc(startYear(academicYear))}` +
      `&${enc(c.coursesField)}=${enc(query)}&page=${page}`
    )
  }

  private async login(username: string, password: string, signal?: AbortSignal) {
    // GET the sign-in page first: it sets the anti-forgery cookie and carries the matching hidden token.
    const loginPage = await this.session.get(this.config.loginPath, signal)
    const form: Record<string, string> = { ...loginFormHiddenFields(loginPage, this.config.passwordField) }
    form[this.config.usernameField] = username
    form[this.config.passwordField] = password
    await this.session.postLogin(form, signal)
  }

  /** Opens the search page. A sign-in form here means: bad credentials (verifying) or an ended session. */
  private async openSearchPage(verifying: boolean, signal?: AbortSignal): Promise<string> {
    const index = await this.session.get(this.config.offeredCoursesPath, signal)
    if (this.showsSignInForm(index)) {
      if (verifying) throw new IsmisAuthenticationError('ISMIS rejected the credentials.')
      throw new IsmisSessionExpiredError('Your ISMIS session has ended. Please sign in again.')
    }
    return index
  }

  private showsSignInForm(html: string | null | undefined): boolean {
    return cheerio.load(html ?? '')(`input[name="${this.config.passwordField}"]`).length > 0
  }

  private serialise<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    if (this.config.logoutPath.trim()) {
      try {
        await this.session.get(this.config.logoutPath)
      } catch {
        // Best effort: the session is discarded either way.
      }
    }
    this.session.close()
  }
}

/** ISMIS's "Academic Period" option values. */
export function academicPeriod(semester: Semester): string {
  switch (semester) {
    case '1ST':
      return 'FIRST_SEMESTER'
    case '2ND':
      return 'SECOND_SEMESTER'
    case 'SUMMER':
      return 'SUMMER'
  }
}

/** "2026-2027" is offered as the single year "2026". */
export function startYear(academicYear: string): string {
  const dash = academicYear.indexOf('-')
  return dash < 0 ? academicYear : academicYear.slice(0, dash)
}

const enc = encodeURIComponent

import { randomUUID } from 'node:crypto'
import { getConfig } from '../config'
import { prisma } from '../db'
import type { Course, Semester } from '../domain/model'
import {
  InvalidCourseDataError,
  IsmisNoResultsError,
  IsmisSessionExpiredError,
  IsmisTooManyResultsError,
  IsmisUnavailableError,
  RateLimitedError,
  ResourceNotFoundError,
  USChedError,
} from '../errors'
import type { IsmisConnection } from '../ismis/connection'
import { importCourses } from './courseImport'
import { recordIsmisFailure } from './ismisHealth'
import { recordUsage } from './usage'
import { ismisSessions, type IsmisSessionService, type Lease } from './ismisSessions'
import { singleton } from './singleton'

export const MAX_QUERIES = 15

export type JobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
export type ItemStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'NO_RESULTS' | 'TOO_MANY' | 'FAILED' | 'SKIPPED'

export interface CourseRef {
  id: number
  code: string
  name: string
  units: number
}

/**
 * suggestions: when the query had no exact match but looked like an elective "slot" code (e.g. a
 * prospectus placeholder like "GE-FEL 2"), the real options ISMIS actually offers under that family
 * (e.g. "GE-FEL"), already imported into the student's own catalog so they can be added directly.
 * searchedAs: what was actually sent to ISMIS, only set when it differs from query (an alias rewrite).
 */
export interface Item {
  query: string
  status: ItemStatus
  message: string
  courses: number
  sections: number
  found: CourseRef[]
  suggestions: CourseRef[]
  searchedAs: string | null
}

export interface JobView {
  jobId: string
  status: JobStatus
  message: string
  items: Item[]
  errorCode: string | null
  errorMessage: string | null
}

const plain = (query: string, status: ItemStatus, message = ''): Item => ({
  query,
  status,
  message,
  courses: 0,
  sections: 0,
  found: [],
  suggestions: [],
  searchedAs: null,
})

class Job {
  readonly id = randomUUID()
  readonly createdAt = Date.now()
  readonly abort = new AbortController()
  status: JobStatus = 'QUEUED'
  message = 'Waiting to start…'
  errorCode: string | null = null
  errorMessage: string | null = null
  items: Item[]

  constructor(
    readonly studentIdNumber: string,
    queries: string[],
  ) {
    this.items = queries.map((q) => plain(q, 'PENDING'))
  }

  terminal(): boolean {
    return this.status === 'DONE' || this.status === 'FAILED'
  }

  running(msg: string) {
    if (!this.terminal()) {
      this.status = 'RUNNING'
      this.message = msg
    }
  }

  skipRemaining(from: number, why: string) {
    for (let i = from; i < this.items.length; i++) {
      const it = this.items[i]
      if (it.status === 'PENDING' || it.status === 'RUNNING') this.items[i] = plain(it.query, 'SKIPPED', why)
    }
  }

  finish() {
    if (!this.terminal()) {
      this.status = 'DONE'
      this.message = 'Finished.'
    }
  }

  fail(code: string, msg: string) {
    if (!this.terminal()) {
      this.status = 'FAILED'
      this.errorCode = code
      this.errorMessage = msg
      this.message = msg
    }
  }

  view(): JobView {
    return {
      jobId: this.id,
      status: this.status,
      message: this.message,
      items: this.items.map((i) => ({ ...i })),
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
    }
  }
}

/** Trims, collapses spaces, drops blanks and duplicates (ignoring case); enforces the size limits. */
export function normaliseQueries(raw: readonly (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of raw ?? []) {
    const q = (r ?? '').trim().replace(/\s+/g, ' ')
    if (!q || seen.has(q.toLowerCase())) continue
    seen.add(q.toLowerCase())
    if (q.length < 2 || q.length > 100) {
      throw new InvalidCourseDataError(`Each course code must be 2 to 100 characters: "${q}"`)
    }
    out.push(q)
  }
  if (out.length === 0) throw new InvalidCourseDataError('Enter at least one course code.')
  if (out.length > MAX_QUERIES) throw new InvalidCourseDataError(`Search at most ${MAX_QUERIES} course codes at a time.`)
  return out
}

// The prefix group excludes digits entirely, including its own last character (course-code prefixes never
// contain any): a plain ".*\S" can still peel off just the final digit of a multi-digit number ("ge-fel 12"
// would wrongly split as "ge-fel 1" + "2"), since a single trailing digit alone still satisfies "\d+" after it.
/** "GE-FEL 2", "IT ELEC 3" -> "GE-FEL", "IT ELEC"; a plain "CIS 2105" -> not attempted (too broad, see below). */
const TRAILING_NUMBER = /^([^0-9]*[^0-9\s])\s*\d+[A-Za-z]?$/

/**
 * Known cases where a course's descriptive name is not its actual, searchable ISMIS code - confirmed case by
 * case, not guessed. "GE-FREELEC" / "GE Free Elective" is just the long-form name for "GE-FEL", which is the
 * real code and has no numbered variants at all: a trailing number (as in "GE-FREELEC 2") is a slot number in
 * the curriculum, not part of the searchable code, so it is dropped, not carried over. Keys are normalised
 * (letters/digits only, uppercased) so hyphen/space variants all match the same way.
 */
const FAMILY_ALIASES: Record<string, string> = {
  GEFREELEC: 'GE-FEL',
  GEFREEELEC: 'GE-FEL',
  // GE-FEL itself, typed directly with a number, still needs the number stripped for the same reason.
  GEFEL: 'GE-FEL',
}

/** Resolves a known family alias (ignoring any trailing slot number) to what ISMIS actually searches by. */
export function resolveAlias(query: string): string {
  const trimmed = query.trim()
  const m = TRAILING_NUMBER.exec(trimmed)
  const family = m ? m[1].trim() : trimmed
  const normalised = family.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return FAMILY_ALIASES[normalised] ?? query
}

const MAX_SUGGESTIONS = 10
const codeKey = (code: string | null | undefined) => (code ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
const searchedAsOf = (query: string, actual: string) => (query.toLowerCase() === actual.toLowerCase() ? null : actual)

/**
 * Runs a student's list of course searches one by one over their signed-in ISMIS session, importing each
 * result into their own private catalog as it arrives. A code with no match or too many matches does not stop
 * the others. Progress is per code. Nothing here ever sees credentials: they were never stored.
 */
export class SearchJobService {
  private readonly jobs = new Map<string, Job>()
  private readonly activeStudents = new Set<string>()
  private running = 0

  constructor(private readonly sessions: IsmisSessionService) {}

  /**
   * Starts a job over the student's own ISMIS session. Fails fast if the session is gone or busy.
   * jobId is an unguessable random id and is itself sufficient to poll the job's status.
   */
  submit(sessionId: string | null | undefined, semester: Semester, academicYear: string, rawQueries: string[]): string {
    const queries = normaliseQueries(rawQueries)
    const cfg = getConfig().scrape
    const lease = this.sessions.lease(sessionId)
    const studentIdNumber = lease.studentIdNumber()
    const job = new Job(studentIdNumber, queries)

    if (this.running >= cfg.maxConcurrent) {
      lease.release()
      throw new RateLimitedError('USChed is busy reading ISMIS for other students. Try again shortly.')
    }
    if (this.activeStudents.has(studentIdNumber)) {
      lease.release()
      throw new RateLimitedError('You already have a search in progress.')
    }
    this.running++
    this.activeStudents.add(studentIdNumber)

    this.purgeOldJobs()
    this.jobs.set(job.id, job)

    void this.run(job, lease, semester, academicYear, queries)

    const budgetSeconds = Math.min(900, cfg.timeoutSeconds * queries.length)
    const watchdog = setTimeout(() => {
      if (!job.terminal()) {
        job.fail('ISMIS_UNAVAILABLE', 'The search timed out.')
        job.abort.abort()
      }
    }, budgetSeconds * 1000)
    watchdog.unref()
    return job.id
  }

  view(jobId: string): JobView {
    const j = this.jobs.get(jobId)
    if (!j) throw new ResourceNotFoundError('Unknown search.')
    return j.view()
  }

  private async run(job: Job, lease: Lease, semester: Semester, year: string, queries: string[]): Promise<void> {
    try {
      for (let i = 0; i < queries.length; i++) {
        if (job.terminal()) break
        const q = queries[i]
        const actual = resolveAlias(q)
        job.running(`Searching ${i + 1} of ${queries.length}: ${q}`)
        job.items[i] = plain(q, 'RUNNING', 'Searching…')
        try {
          job.items[i] = await this.searchOne(lease.connection(), semester, year, q, actual, job)
        } catch (e) {
          recordIsmisFailure(e)
          if (e instanceof IsmisNoResultsError) {
            job.items[i] = await this.noResultsWithSuggestions(lease.connection(), semester, year, q, actual, job, e)
          } else if (e instanceof IsmisTooManyResultsError) {
            job.items[i] = { ...plain(q, 'TOO_MANY', e.message), searchedAs: searchedAsOf(q, actual) }
          } else if (e instanceof IsmisSessionExpiredError) {
            lease.destroy()
            job.items[i] = plain(q, 'FAILED', e.message)
            job.skipRemaining(i + 1, 'Your ISMIS session ended.')
            job.fail('ISMIS_SESSION_EXPIRED', e.message)
            return
          } else if (e instanceof IsmisUnavailableError) {
            job.items[i] = plain(q, 'FAILED', e.message)
            job.skipRemaining(i + 1, 'ISMIS could not be reached.')
            job.fail(e.code, e.message)
            return
          } else if (e instanceof USChedError) {
            job.items[i] = plain(q, 'FAILED', e.message)
          } else {
            throw e
          }
        }
      }
      job.finish()
    } catch {
      job.fail('INTERNAL_ERROR', 'Something went wrong while searching.')
    } finally {
      lease.release()
      this.running--
      this.activeStudents.delete(job.studentIdNumber)
    }
  }

  /** query is what the student typed (shown back to them); actual is what is actually sent to ISMIS. */
  private async searchOne(
    connection: IsmisConnection,
    semester: Semester,
    year: string,
    query: string,
    actual: string,
    job: Job,
  ): Promise<Item> {
    const result = await connection.search(semester, year, actual, job.abort.signal)
    const report = await importCourses(
      { type: 'ISMIS', courses: result.courses, skipped: result.skipped, providesUnits: connection.providesUnits() },
      semester,
      year,
      job.studentIdNumber,
    )
    // Which courses people look for, counted anonymously from the catalog's own codes, never from what was typed.
    for (const c of result.courses) recordUsage('SEARCH', codeKey(c.code))
    await this.applyProspectusUnits(connection, result.courses, job)
    const found = await this.importedRefs(result.courses, job.studentIdNumber)
    return {
      query,
      status: 'DONE',
      message: '',
      courses: report.courses,
      sections: report.sections,
      found,
      suggestions: [],
      searchedAs: searchedAsOf(query, actual),
    }
  }

  /**
   * ISMIS's offered-courses table has no units column, so freshly imported courses carry a default. The
   * student's own prospectus does list real units: where a searched course appears in it, store those
   * instead. Best effort: if the prospectus cannot be read, the search result stands as it is.
   */
  private async applyProspectusUnits(connection: IsmisConnection, imported: readonly Course[], job: Job): Promise<void> {
    const known = new Map<string, number>()
    try {
      for (const pc of (await connection.prospectus(job.abort.signal)).courses) {
        if (!known.has(codeKey(pc.code))) known.set(codeKey(pc.code), pc.units)
      }
    } catch {
      return
    }
    for (const c of imported) {
      const units = known.get(codeKey(c.code))
      if (units === undefined || units <= 0) continue
      const row = await prisma.course.findUnique({
        where: { studentIdNumber_code: { studentIdNumber: job.studentIdNumber, code: c.code } },
      })
      if (row && Number(row.units) !== units) {
        await prisma.course.update({ where: { id: row.id }, data: { units } })
      }
    }
  }

  private async importedRefs(imported: readonly Course[], studentIdNumber: string): Promise<CourseRef[]> {
    const refs: CourseRef[] = []
    for (const c of imported) {
      const row = await prisma.course.findUnique({ where: { studentIdNumber_code: { studentIdNumber, code: c.code } } })
      if (row) refs.push({ id: row.id, code: row.code, name: row.name, units: Number(row.units) })
    }
    return refs
  }

  /**
   * When an exact search finds nothing, and the code looks like a numbered "slot" in a family (a prospectus
   * placeholder such as "GE-FEL 2" rather than a specific course), tries the family's own prefix ("GE-FEL")
   * and offers whatever ISMIS actually has under it. Only attempted for prefixes of 5+ characters: a short
   * one (like "CIS" or "NSTP") is a whole department, not a slot, and broadening automatically to it would
   * mean an unasked-for, much heavier scrape for little benefit. Failures here are swallowed: the original
   * "no results" stands either way.
   */
  private async noResultsWithSuggestions(
    connection: IsmisConnection,
    semester: Semester,
    year: string,
    query: string,
    actual: string,
    job: Job,
    original: IsmisNoResultsError,
  ): Promise<Item> {
    const none = (message: string, suggestions: CourseRef[] = []): Item => ({
      ...plain(query, 'NO_RESULTS', message),
      suggestions,
      searchedAs: searchedAsOf(query, actual),
    })
    const m = TRAILING_NUMBER.exec(actual)
    const prefix = m ? m[1].trim() : null
    if (prefix === null || prefix.length < 5 || prefix.toLowerCase() === actual.toLowerCase()) return none(original.message)
    try {
      const result = await connection.search(semester, year, prefix, job.abort.signal)
      const report = await importCourses(
        { type: 'ISMIS', courses: result.courses, skipped: result.skipped, providesUnits: connection.providesUnits() },
        semester,
        year,
        job.studentIdNumber,
      )
      await this.applyProspectusUnits(connection, result.courses, job)
      let suggestions = await this.importedRefs(result.courses, job.studentIdNumber)
      if (suggestions.length > MAX_SUGGESTIONS) suggestions = suggestions.slice(0, MAX_SUGGESTIONS)
      const message =
        suggestions.length === 0
          ? original.message
          : `No exact match for "${query}", but ISMIS offers ${report.courses} "${prefix}" ${report.courses === 1 ? 'course' : 'courses'} this term.`
      return none(message, suggestions)
    } catch (e) {
      if (!(e instanceof USChedError)) throw e
      // The fallback itself failing (e.g. also no results, or ISMIS hiccups) is not the student's problem;
      // the original "no exact match" message is enough on its own.
      return none(original.message)
    }
  }

  private purgeOldJobs() {
    const cutoff = Date.now() - 3_600_000
    for (const [id, j] of this.jobs) if (j.terminal() && j.createdAt < cutoff) this.jobs.delete(id)
  }
}

export const searchJobs = (): SearchJobService => singleton('searchJobs', () => new SearchJobService(ismisSessions()))

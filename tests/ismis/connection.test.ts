// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  IsmisAuthenticationError,
  IsmisChallengeError,
  IsmisLayoutChangedError,
  IsmisNoResultsError,
  IsmisNotConfiguredError,
  IsmisSessionExpiredError,
  IsmisUnavailableError,
  ScraperError,
} from '@/server/errors'
import { loadConfig } from '@/server/config'
import { IsmisConnection } from '@/server/ismis/connection'
import { IsmisSession } from '@/server/ismis/session'
import { FakeIsmis } from '../support/fakeIsmis'

let ismis: FakeIsmis
beforeAll(async () => {
  ismis = await FakeIsmis.start()
})
afterAll(() => ismis.close())
beforeEach(() => {
  ismis.reset()
  ismis.expireSessions()
})

const signIn = (password = 'correct-horse') => IsmisConnection.signIn(ismis.config(), 'student', password)

describe('IsmisConnection', () => {
  it('one sign-in serves several searches', async () => {
    const before = ismis.loginPosts()
    const c = await signIn()
    expect((await c.search('1ST', '2026-2027', 'CIS 2105')).courses).toHaveLength(2)
    expect((await c.search('1ST', '2026-2027', 'MATH 1101')).courses).toHaveLength(2)
    await expect(c.search('1ST', '2026-2027', 'nomatch')).rejects.toBeInstanceOf(IsmisNoResultsError)
    expect(c.providesUnits()).toBe(false)
    await c.close()
    expect(ismis.loginPosts() - before).toBe(1)
  })

  it('treats wrong credentials as an authentication failure, not an expired session', async () => {
    await expect(signIn('nope')).rejects.toBeInstanceOf(IsmisAuthenticationError)
    await expect(signIn('nope')).rejects.not.toBeInstanceOf(IsmisSessionExpiredError)
  })

  it('reports a session ISMIS dropped as expired so the student signs in again', async () => {
    const c = await signIn()
    await c.search('1ST', '2026-2027', 'CIS 2105')
    ismis.expireSessions()
    await expect(c.search('1ST', '2026-2027', 'CIS 2105')).rejects.toBeInstanceOf(IsmisSessionExpiredError)
    await c.close()
  })

  it('fetches the prospectus once and caches it for the session', async () => {
    const count = () => ismis.hits().filter((h) => h.startsWith('GET /prospectus')).length
    const before = count()
    const c = await signIn()
    const p1 = await c.prospectus()
    expect(p1.programName).toBe('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY')
    expect(p1.effectiveYear).toBe('2023')
    expect(p1.courses).toHaveLength(5)
    expect(await c.prospectus()).toBe(p1) // cached: no second GET
    await c.close()
    expect(count() - before).toBe(1)
  })

  it('cannot search once closed, and closing twice is harmless', async () => {
    const c = await signIn()
    await c.close()
    await c.close()
    await expect(c.search('1ST', '2026-2027', 'CIS 2105')).rejects.toBeInstanceOf(IsmisSessionExpiredError)
  })

  it('does not keep the password anywhere on the connection', async () => {
    const c = await signIn()
    expect(JSON.stringify(Object.entries(c as unknown as object))).not.toContain('correct-horse')
    await c.close()
  })

  it('serialises concurrent searches on one connection', async () => {
    const c = await signIn()
    const [a, b] = await Promise.all([c.search('1ST', '2026-2027', 'CIS 2105'), c.search('1ST', '2026-2027', 'MATH 1101')])
    expect(a.courses).toHaveLength(2)
    expect(b.courses).toHaveLength(2)
    await c.close()
  })
})

describe('scraper safety', () => {
  it('happy path reads courses and skips the broken row', async () => {
    const c = await signIn()
    const r = await c.search('1ST', '2026-2027', '')
    expect(r.courses.map((x) => x.code)).toEqual(['CIS 2105', 'MATH 1101'])
    expect(r.courses[0].sections).toHaveLength(3)
    expect(r.skipped).toHaveLength(1)
    await c.close()
  })

  it('stops at a CAPTCHA instead of bypassing it', async () => {
    ismis.mode = 'CAPTCHA'
    await expect(signIn()).rejects.toBeInstanceOf(IsmisChallengeError)
  })

  it('reports layout drift instead of importing it', async () => {
    const c = await signIn()
    ismis.mode = 'LAYOUT_CHANGED'
    await expect(c.search('1ST', '2026-2027', 'x')).rejects.toBeInstanceOf(IsmisLayoutChangedError)
    await c.close()
  })

  it('layout errors describe the page structure but never its content', async () => {
    const c = await signIn()
    ismis.mode = 'LAYOUT_CHANGED'
    const e = await c.search('1ST', '2026-2027', 'x').catch((x: Error) => x)
    expect(e).toBeInstanceOf(IsmisLayoutChangedError)
    expect((e as Error).message).toContain('forms=[]')
    expect((e as Error).message).toContain('tables=[]')
    expect((e as Error).message).not.toContain('redesigned')
    await c.close()
  })

  it("follows the page's AJAX link when the filter form is not in the raw page", async () => {
    ismis.mode = 'FILTER_VIA_AJAX'
    const c = await signIn()
    const r = await c.search('1ST', '2026-2027', '')
    expect(r.courses.map((x) => x.code)).toEqual(['CIS 2105', 'MATH 1101'])
    expect(ismis.hits()).toContain('GET /CourseSchedule/OfferedCoursesFilter')
    await c.close()
  })

  it("sends the student's query in the search box", async () => {
    const c = await signIn()
    await c.search('1ST', '2026-2027', 'CIS 2105')
    const search = ismis.bodies().filter((b) => b.includes('AcademicPeriod=')).at(-1)!
    expect(search).toContain('Courses=CIS%202105')
    await c.close()
  })

  it('reports a search that matches nothing as friendly no-results, not a layout error', async () => {
    const c = await signIn()
    await expect(c.search('1ST', '2026-2027', 'nomatch')).rejects.toThrow(/nomatch/)
    await expect(c.search('1ST', '2026-2027', 'shortnomatch')).rejects.toBeInstanceOf(IsmisNoResultsError)
    await c.close()
  })

  it('fetches and aggregates multi-page searches', async () => {
    const c = await signIn()
    const r = await c.search('1ST', '2026-2027', 'many')
    expect(r.courses.map((x) => x.code)).toEqual(['AA 3101', 'AC 1101', 'AC 1102'])
    // the dissolved section on page 1 has no schedule and is skipped, but every page was still fetched
    expect(r.skipped).toEqual(['AA 3101 - Group 4 (row 4): no usable schedule'])
    expect(ismis.hits().some((h) => h.startsWith('GET /search?') && h.includes('AcademicPeriod=FIRST_SEMESTER') && h.includes('AcademicYear=2026') && h.includes('Courses=many') && h.includes('page=2'))).toBe(true)
    await c.close()
  })

  it('skips pages beyond the configured cap and says so', async () => {
    const c = await IsmisConnection.signIn(ismis.config({ maxPages: 2 }), 'student', 'correct-horse')
    const r = await c.search('1ST', '2026-2027', 'many')
    expect(r.courses.map((x) => x.code)).toEqual(['AA 3101', 'AC 1101']) // page 3 skipped
    expect(r.skipped.some((n) => n.includes('pages 1-2 of 3'))).toBe(true)
    await c.close()
  })

  it('treats the site being down as unavailable', async () => {
    ismis.mode = 'DOWN'
    await expect(signIn()).rejects.toBeInstanceOf(IsmisUnavailableError)
  })

  it('treats an unconfigured integration as not set up', async () => {
    const blank = { ...loadConfig({}).ismis, baseUrl: '' }
    await expect(IsmisConnection.signIn(blank, 'a', 'b')).rejects.toBeInstanceOf(IsmisNotConfiguredError)
  })

  it('blocks write-like requests before they leave the machine', async () => {
    const before = ismis.hits().length
    const s = new IsmisSession(ismis.config())
    await expect(s.request('POST', '/offered', 'x')).rejects.toBeInstanceOf(ScraperError)
    await expect(s.request('POST', '/enroll', 'x')).rejects.toBeInstanceOf(ScraperError)
    await expect(s.get('/enroll')).rejects.toBeInstanceOf(ScraperError)
    await expect(s.get('http://evil.example/offered')).rejects.toBeInstanceOf(ScraperError)
    // methods outside GET/POST are unrepresentable in the typed API; a forced one is refused too
    await expect(s.request('DELETE' as 'GET', '/offered', null)).rejects.toBeInstanceOf(ScraperError)
    await expect(s.request('PUT' as 'GET', '/offered', 'x')).rejects.toBeInstanceOf(ScraperError)
    expect(ismis.hits()).toHaveLength(before)
  })

  it("echoes the form's hidden fields and selects the term in the search POST", async () => {
    const c = await signIn()
    await c.search('1ST', '2026-2027', '')
    const search = ismis.bodies().filter((b) => b.includes('AcademicPeriod=')).at(-1)!
    expect(search).toContain('AcademicPeriod=FIRST_SEMESTER')
    expect(search).toContain('AcademicYear=2026')
    expect(search).toContain('AjaxFormVM.Controller=CourseSchedule')
    expect(search).toContain('__RequestVerificationToken=srch-456')
    await c.close()
  })

  it('refuses a form that posts somewhere other than the search path', async () => {
    ismis.mode = 'EVIL_ACTION'
    const c = await signIn()
    const before = ismis.hits().length
    await expect(c.search('1ST', '2026-2027', '')).rejects.toBeInstanceOf(ScraperError)
    expect(ismis.hits().slice(before).some((h) => h.includes('/enroll'))).toBe(false)
    await c.close()
  })

  it('never issues anything other than GETs and the two permitted POSTs', async () => {
    const before = ismis.hits().length
    const c = await signIn()
    await c.search('1ST', '2026-2027', 'CIS 2105')
    await c.close()
    const allowed = /^(GET \/(login|offered|logout|home|CourseSchedule\/OfferedCoursesFilter|search)|POST \/(login|search))(\?.*)?$/
    for (const h of ismis.hits().slice(before)) expect(h).toMatch(allowed)
  })
})

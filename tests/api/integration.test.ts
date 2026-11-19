// @vitest-environment node
//
// End-to-end tests of the HTTP API and the services behind it, against a real MySQL database and a fake ISMIS.
// They wipe every table, so they only run when TEST_DATABASE_URL points at a database whose name ends in
// "_test" (apply the schema first: DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy). Example:
//
//   TEST_DATABASE_URL=mysql://root@localhost:3306/uched_test npm test
//
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeIsmis } from '../support/fakeIsmis'
import { call } from '../support/api'

const dbUrl = process.env.TEST_DATABASE_URL
const safe = !!dbUrl && /_test(\?.*)?$/.test(dbUrl)

const HEADER =
  'course_code,course_name,units,department,section_code,instructor,semester,academic_year,available_slots,meeting_type,day,start_time,end_time,room,campus\n'
const STUDENT = '241F065'
const SENTINEL = 'SENTINEL-p4ssw0rd-9f3a71'
const ADMIN = 'test-admin-token'

const row = (code: string, name: string, section: string, day: string, start: string, end: string) =>
  `${code},${name},3,DCISM,${section},Juan Dela Cruz,1ST,2026-2027,40,LECTURE,${day},${start},${end},LB 201,Talamban\n`

describe.skipIf(!safe)('API against MySQL', () => {
  let ismis: FakeIsmis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let m: Record<string, any>

  beforeAll(async () => {
    ismis = await FakeIsmis.start()
    process.env.DATABASE_URL = dbUrl
    Object.assign(process.env, {
      UCHED_ADMIN_TOKEN: ADMIN,
      UCHED_ISMIS_BASE_URL: ismis.baseUrl(),
      UCHED_ISMIS_LOGIN_PATH: '/login',
      UCHED_ISMIS_OFFERED_PATH: '/offered',
      UCHED_ISMIS_SEARCH_PATH: '/search',
      UCHED_ISMIS_PROSPECTUS_PATH: '/prospectus',
      UCHED_ISMIS_LOGOUT_PATH: '',
      UCHED_ISMIS_USERNAME_FIELD: 'user',
      UCHED_ISMIS_PASSWORD_FIELD: 'pass',
      UCHED_ISMIS_MIN_DELAY_MS: '0',
    })
    const [config, db, consent, sessions, jobs, csv, importer, courses, routes] = await Promise.all([
      import('@/server/config'),
      import('@/server/db'),
      import('@/server/services/consent'),
      import('@/server/services/ismisSessions'),
      import('@/server/services/searchJobs'),
      import('@/server/datasource/csv'),
      import('@/server/services/courseImport'),
      import('@/server/services/courses'),
      Promise.all([
        import('@/app/api/consent/route'),
        import('@/app/api/consent/terms/route'),
        import('@/app/api/ismis/session/route'),
        import('@/app/api/ismis/searches/route'),
        import('@/app/api/ismis/searches/[jobId]/route'),
        import('@/app/api/ismis/prospectus/route'),
        import('@/app/api/courses/route'),
        import('@/app/api/courses/[id]/route'),
        import('@/app/api/courses/[id]/sections/route'),
        import('@/app/api/schedules/generate/route'),
        import('@/app/api/schedules/compare/route'),
        import('@/app/api/meta/semesters/route'),
        import('@/app/api/meta/departments/route'),
        import('@/app/api/meta/academic-years/route'),
        import('@/app/api/catalog/status/route'),
        import('@/app/api/admin/import/route'),
      ]),
    ])
    const [consentR, termsR, sessionR, searchesR, searchR, prospectusR, coursesR, courseR, sectionsR, generateR, compareR, semestersR, deptsR, yearsR, statusR, adminR] = routes
    m = { config, db, consent, sessions, jobs, csv, importer, courses,
      r: { consentR, termsR, sessionR, searchesR, searchR, prospectusR, coursesR, courseR, sectionsR, generateR, compareR, semestersR, deptsR, yearsR, statusR, adminR } }
  })

  afterAll(async () => {
    await m?.db.prisma.$disconnect()
    await ismis?.close()
  })

  let sessionId = ''
  const asStudent = (extra: Record<string, string> = {}) => ({ 'X-Ismis-Session': sessionId, ...extra })

  beforeEach(async () => {
    const { prisma } = m.db
    await prisma.meeting.deleteMany()
    await prisma.section.deleteMany()
    await prisma.course.deleteMany()
    await prisma.instructor.deleteMany()
    await prisma.room.deleteMany()
    await prisma.catalogSnapshot.deleteMany()
    await prisma.consentRecord.deleteMany()
    ismis.reset()
    ismis.expireSessions()
    m.config.resetConfigForTests()
    sessionId = m.sessions.ismisSessions().seedTestSession(STUDENT)
  })

  const load = async (rows: string, student = STUDENT) =>
    m.importer.importCourses(m.csv.readCsvCourses(HEADER + rows, '1ST', '2026-2027'), '1ST', '2026-2027', student)

  const courseId = async (code: string): Promise<number> => {
    const r = await call(m.r.coursesR.GET, 'GET', `/api/courses?q=${encodeURIComponent(code)}&semester=1ST&academicYear=2026-2027`, { headers: asStudent() })
    expect(r.status).toBe(200)
    return r.json.items[0].id
  }

  const grant = async (): Promise<string> => {
    const r = await call(m.r.consentR.POST, 'POST', '/api/consent', {
      json: { termsVersion: '2026-11-19-2', agreedTerms: true, agreedCredentialUse: true },
    })
    expect(r.status).toBe(200)
    return r.json.consentToken
  }

  // ---- Private per-student catalog ------------------------------------------------------------------------

  describe('private catalog', () => {
    it("one student's courses are invisible to another", async () => {
      await load(row('CIS 2105', 'Networking II', 'A', 'MON', '08:00', '09:30'))
      const other = m.sessions.ismisSessions().seedTestSession('066E164')
      const q = '?semester=1ST&academicYear=2026-2027'
      const mine = await call(m.r.coursesR.GET, 'GET', `/api/courses${q}`, { headers: asStudent() })
      const theirs = await call(m.r.coursesR.GET, 'GET', `/api/courses${q}`, { headers: { 'X-Ismis-Session': other } })
      expect(mine.json.total).toBe(1)
      expect(theirs.json.total).toBe(0)

      const id = mine.json.items[0].id
      const get = await call(m.r.courseR.GET, 'GET', `/api/courses/${id}`, { headers: { 'X-Ismis-Session': other }, params: { id: String(id) } })
      expect(get.status).toBe(404)
      expect(get.json.code).toBe('NOT_FOUND')
      const secs = await call(m.r.sectionsR.GET, 'GET', `/api/courses/${id}/sections${q}`, { headers: { 'X-Ismis-Session': other }, params: { id: String(id) } })
      expect(secs.status).toBe(404)
      // Generating a schedule with someone else's course id fails the same way a made-up id would.
      const gen = await call(m.r.generateR.POST, 'POST', '/api/schedules/generate', {
        headers: { 'X-Ismis-Session': other },
        json: { courseIds: [id], semester: '1ST', academicYear: '2026-2027' },
      })
      expect(gen.status).toBe(404)
      expect(gen.json.code).toBe('NOT_FOUND')
    })

    it('DELETE /api/courses wipes only the signed-in student\'s catalog', async () => {
      await load(row('CIS 2105', 'Networking II', 'A', 'MON', '08:00', '09:30'))
      await load(row('MATH 1101', 'Calculus 1', 'A', 'TUE', '10:00', '11:30'))
      const other = m.sessions.ismisSessions().seedTestSession('066E164')
      await load(row('ENG 1101', 'Communication Arts', 'A', 'WED', '13:00', '14:30'), '066E164')

      const del = await call(m.r.coursesR.DELETE, 'DELETE', '/api/courses', { headers: asStudent() })
      expect(del.status).toBe(204)
      const q = '?semester=1ST&academicYear=2026-2027'
      expect((await call(m.r.coursesR.GET, 'GET', `/api/courses${q}`, { headers: asStudent() })).json.total).toBe(0)
      expect((await call(m.r.coursesR.GET, 'GET', `/api/courses${q}`, { headers: { 'X-Ismis-Session': other } })).json.total).toBe(1)
    })

    it('student-scoped endpoints need a live ISMIS session, but semesters do not', async () => {
      expect((await call(m.r.semestersR.GET, 'GET', '/api/meta/semesters')).json[0].code).toBe('1ST')
      for (const [h, p] of [[m.r.deptsR.GET, '/api/meta/departments'], [m.r.yearsR.GET, '/api/meta/academic-years'], [m.r.coursesR.GET, '/api/courses?semester=1ST&academicYear=2026-2027']] as const) {
        const r = await call(h, 'GET', p)
        expect(r.status).toBe(401)
        expect(r.json.code).toBe('ISMIS_SESSION_EXPIRED')
      }
    })
  })

  // ---- Schedules --------------------------------------------------------------------------------------------

  describe('schedules API', () => {
    const generate = (json: unknown) => call(m.r.generateR.POST, 'POST', '/api/schedules/generate', { headers: asStudent(), json })
    const term = { semester: '1ST', academicYear: '2026-2027' }

    it('search and sections endpoints', async () => {
      await load(row('CIS 2201', 'Systems Analysis', 'A', 'MON', '08:00', '09:30'))
      const id = await courseId('cis 2201')
      const one = await call(m.r.courseR.GET, 'GET', `/api/courses/${id}`, { headers: asStudent(), params: { id: String(id) } })
      expect(one.json.code).toBe('CIS 2201')
      const secs = await call(m.r.sectionsR.GET, 'GET', `/api/courses/${id}/sections?semester=1ST&academicYear=2026-2027`, { headers: asStudent(), params: { id: String(id) } })
      expect(secs.json[0]).toMatchObject({ sectionCode: 'A', instructor: 'Juan Dela Cruz' })
      expect(secs.json[0].meetings[0]).toEqual({ day: 'MON', start: '08:00', end: '09:30', room: 'LB 201', type: 'LECTURE' })
      const missing = await call(m.r.courseR.GET, 'GET', '/api/courses/999999', { headers: asStudent(), params: { id: '999999' } })
      expect(missing.status).toBe(404)
      expect(missing.json.code).toBe('NOT_FOUND')
      expect((await call(m.r.deptsR.GET, 'GET', '/api/meta/departments', { headers: asStudent() })).json[0]).toBe('DCISM')
      expect((await call(m.r.yearsR.GET, 'GET', '/api/meta/academic-years', { headers: asStudent() })).json).toEqual(['2026-2027'])
    })

    it('generates ranked, conflict-free schedules', async () => {
      await load(
        row('CIS 2201', 'Systems Analysis', 'A', 'MON', '08:00', '09:30') +
          row('CIS 2201', 'Systems Analysis', 'B', 'MON', '10:30', '12:00') +
          row('MATH 1101', 'Calculus', 'A', 'MON', '09:00', '10:30'),
      )
      const r = await generate({ courseIds: [await courseId('CIS 2201'), await courseId('MATH 1101')], ...term })
      expect(r.status).toBe(200)
      expect(r.json).toMatchObject({ generatedCount: 1, returnedCount: 1, totalUnits: 6 })
      expect(r.json.schedules[0]).toMatchObject({ rank: 1 })
      expect(r.json.schedules[0].sections).toHaveLength(2)
      expect(r.json.schedules[0].breakdown).toHaveProperty('Compact')
      expect(r.json.schedules[0].stats.schoolDays).toBe(1)
    })

    it('hard preferences filter the results', async () => {
      await load(row('CIS 2201', 'Systems Analysis', 'A', 'MON', '07:00', '08:30') + row('CIS 2201', 'Systems Analysis', 'B', 'TUE', '10:00', '11:30'))
      const r = await generate({
        courseIds: [await courseId('CIS 2201')],
        ...term,
        preferences: { hard: { earliestStart: '08:00' }, soft: { preferMorning: true } },
      })
      expect(r.json.generatedCount).toBe(1)
      expect(r.json.schedules[0].sections[0].sectionCode).toBe('B')
    })

    it('rejects an empty selection as a validation error', async () => {
      const r = await generate({ courseIds: [], ...term })
      expect(r.status).toBe(400)
      expect(r.json.code).toBe('VALIDATION_ERROR')
    })

    it('rejects a bad preference value as invalid data', async () => {
      await load(row('CIS 2201', 'Systems Analysis', 'A', 'MON', '08:00', '09:30'))
      const r = await generate({ courseIds: [await courseId('CIS 2201')], ...term, preferences: { hard: { maxSchoolDays: 0 } } })
      expect(r.status).toBe(400)
      expect(r.json.code).toBe('INVALID_DATA')
    })

    it('an unknown course is not found', async () => {
      const r = await generate({ courseIds: [424242], ...term })
      expect(r.status).toBe(404)
      expect(r.json.code).toBe('NOT_FOUND')
    })

    it('an impossible selection explains the conflict', async () => {
      await load(row('CIS 3301', 'Software Engineering', 'A', 'MON', '08:00', '09:30') + row('ENG 1101', 'Communication', 'A', 'MON', '09:00', '10:30'))
      const r = await generate({ courseIds: [await courseId('CIS 3301'), await courseId('ENG 1101')], ...term })
      expect(r.status).toBe(422)
      expect(r.json.code).toBe('NO_VALID_SCHEDULE')
      expect(r.json.details[0]).toContain('CIS 3301')
    })

    it('"More like this" prefers schedules sharing sections with the reference, and never repeats it', async () => {
      await load(
        row('MATH 1101', 'Calculus', 'A', 'MON', '08:00', '09:00') +
          row('MATH 1101', 'Calculus', 'B', 'TUE', '08:00', '09:00') +
          row('ENG 1101', 'Comm', 'A', 'MON', '10:00', '11:00') +
          row('ENG 1101', 'Comm', 'B', 'WED', '10:00', '11:00'),
      )
      const courseIds = [await courseId('MATH 1101'), await courseId('ENG 1101')]
      const first = await generate({ courseIds, ...term })
      const reference: number[] = first.json.schedules[0].sections.map((s: { sectionId: number }) => s.sectionId)

      const like = await generate({ courseIds, ...term, likeSectionIds: reference })
      expect(like.status).toBe(200)
      const all: number[][] = like.json.schedules.map((s: { sections: { sectionId: number }[] }) => s.sections.map((x) => x.sectionId))
      expect(all.some((ids) => ids.length === reference.length && ids.every((id) => reference.includes(id)))).toBe(false)
      expect(all[0].filter((id) => reference.includes(id)).length).toBeGreaterThanOrEqual(1)
    })

    it('compare computes metrics on the server and wants 2-4 schedules', async () => {
      await load(row('CIS 2201', 'Systems Analysis', 'A', 'MON', '08:00', '09:30') + row('CIS 2201', 'Systems Analysis', 'B', 'TUE', '13:00', '14:30'))
      const id = await courseId('CIS 2201')
      const secs = await call(m.r.sectionsR.GET, 'GET', `/api/courses/${id}/sections?semester=1ST&academicYear=2026-2027`, { headers: asStudent(), params: { id: String(id) } })
      const [a, b] = secs.json.map((s: { sectionId: number }) => s.sectionId)
      const ok = await call(m.r.compareR.POST, 'POST', '/api/schedules/compare', { headers: asStudent(), json: { schedules: [[a], [b]] } })
      expect(ok.status).toBe(200)
      expect(ok.json.items).toHaveLength(2)
      expect(ok.json.items[0].stats.earliestStart).toBe('08:00')
      const bad = await call(m.r.compareR.POST, 'POST', '/api/schedules/compare', { headers: asStudent(), json: { schedules: [[a]] } })
      expect(bad.status).toBe(400)
    })
  })

  // ---- Consent & admin --------------------------------------------------------------------------------------

  describe('consent and admin', () => {
    const login = { username: 'u', password: 'p' }
    const postSession = (token: string | null) =>
      call(m.r.sessionR.POST, 'POST', '/api/ismis/session', { headers: token ? { 'X-Consent-Token': token } : {}, json: login })

    it('serves the terms with their version', async () => {
      const r = await call(m.r.termsR.GET, 'GET', '/api/consent/terms')
      expect(r.json.version).toBe('2026-11-19-2')
      expect(r.json.text).toContain('Terms of Use')
    })

    it('forbids ISMIS endpoints without a consent token', async () => {
      const r = await postSession(null)
      expect(r.status).toBe(403)
      expect(r.json.code).toBe('CONSENT_REQUIRED')
      expect((await call(m.r.searchR.GET, 'GET', '/api/ismis/searches/abc', { params: { jobId: 'abc' } })).status).toBe(403)
    })

    it('rejects invalid search requests', async () => {
      const token = await grant()
      const base = { semester: '1ST', academicYear: '2026-2027' }
      const bodies = [
        { ...base, queries: [] },
        { ...base, queries: ['x'] },
        base,
        { ...base, queries: [...Array(15).fill('CIS 1'), 'CIS 2'] },
      ]
      for (const json of bodies) {
        const r = await call(m.r.searchesR.POST, 'POST', '/api/ismis/searches', { headers: { 'X-Consent-Token': token, 'X-Ismis-Session': 'nope' }, json })
        expect(r.status).toBe(400)
        expect(r.json.code).toBe('VALIDATION_ERROR')
      }
    })

    it('asks to sign in again when searching without a live session', async () => {
      const token = await grant()
      const r = await call(m.r.searchesR.POST, 'POST', '/api/ismis/searches', {
        headers: { 'X-Consent-Token': token, 'X-Ismis-Session': 'made-up' },
        json: { semester: '1ST', academicYear: '2026-2027', queries: ['CIS 2105'] },
      })
      expect(r.status).toBe(401)
      expect(r.json.code).toBe('ISMIS_SESSION_EXPIRED')
    })

    it('forbids garbage or tampered tokens', async () => {
      const token = await grant()
      for (const bad of ['garbage', token + 'x', 'a.' + token.split('.')[1]]) {
        const r = await postSession(bad)
        expect(r.status).toBe(403)
        expect(r.json.code).toBe('CONSENT_REQUIRED')
      }
    })

    it('forbids an expired token', async () => {
      process.env.UCHED_CONSENT_TTL_MINUTES = '-1'
      m.config.resetConfigForTests()
      let token: string
      try {
        token = await grant()
      } finally {
        delete process.env.UCHED_CONSENT_TTL_MINUTES
        m.config.resetConfigForTests()
      }
      expect((await postSession(token)).status).toBe(403)
    })

    it('forbids a token for an old terms version', async () => {
      const token = await grant()
      process.env.UCHED_TERMS_VERSION = '2099-1-1'
      m.config.resetConfigForTests()
      try {
        const r = await postSession(token)
        expect(r.status).toBe(403)
        expect(r.json.code).toBe('CONSENT_REQUIRED')
      } finally {
        delete process.env.UCHED_TERMS_VERSION
        m.config.resetConfigForTests()
      }
    })

    it('needs both consents and the current version to issue a token', async () => {
      for (const json of [
        { termsVersion: '2026-11-19-2', agreedTerms: true, agreedCredentialUse: false },
        { termsVersion: '1999-1-1', agreedTerms: true, agreedCredentialUse: true },
      ]) {
        expect((await call(m.r.consentR.POST, 'POST', '/api/consent', { json })).status).toBe(403)
      }
    })

    it('records consent evidence without credentials or the raw IP', async () => {
      await call(m.r.consentR.POST, 'POST', '/api/consent', {
        headers: { 'x-forwarded-for': '203.0.113.7' },
        json: { termsVersion: '2026-11-19-2', agreedTerms: true, agreedCredentialUse: true },
      })
      const rows = await m.db.prisma.consentRecord.findMany()
      expect(rows).toHaveLength(1)
      expect(JSON.stringify(rows)).not.toContain('203.0.113.7')
      expect(rows[0].ipHash).toHaveLength(64)
    })

    it('accepts a valid token, then fails cleanly if ISMIS is not configured', async () => {
      const token = await grant()
      process.env.UCHED_ISMIS_BASE_URL = ''
      m.config.resetConfigForTests()
      try {
        const r = await postSession(token)
        expect(r.status).toBe(503)
        expect(r.json.code).toBe('ISMIS_NOT_CONFIGURED')
      } finally {
        process.env.UCHED_ISMIS_BASE_URL = ismis.baseUrl()
        m.config.resetConfigForTests()
      }
    })

    it('refuses plain HTTP on ISMIS endpoints when HTTPS is required', async () => {
      process.env.UCHED_REQUIRE_HTTPS = 'true'
      m.config.resetConfigForTests()
      try {
        const r = await postSession(await grant())
        expect(r.status).toBe(403)
        expect(r.json.code).toBe('HTTPS_REQUIRED')
        const secure = await call(m.r.sessionR.POST, 'POST', '/api/ismis/session', {
          headers: { 'X-Consent-Token': await grant(), 'x-forwarded-proto': 'https' },
          json: login,
        })
        expect(secure.headers.get('strict-transport-security')).toContain('max-age=')
        expect(secure.json.code).not.toBe('HTTPS_REQUIRED')
      } finally {
        delete process.env.UCHED_REQUIRE_HTTPS
        m.config.resetConfigForTests()
      }
    })

    it('never caches ISMIS responses', async () => {
      const r = await postSession(await grant())
      expect(r.headers.get('cache-control')).toBe('no-store')
    })

    const csvForm = (csv: string, extra: Record<string, string> = {}) => {
      const form = new FormData()
      form.set('file', new File([csv], 'c.csv', { type: 'text/csv' }))
      form.set('semester', '1ST')
      form.set('academicYear', '2026-2027')
      form.set('studentIdNumber', STUDENT)
      for (const [k, v] of Object.entries(extra)) form.set(k, v)
      return form
    }

    it('admin import needs the token', async () => {
      const csv = HEADER + row('CIS 1101', 'Intro', 'A', 'MON', '08:00', '09:00')
      expect((await call(m.r.adminR.POST, 'POST', '/api/admin/import', { form: csvForm(csv) })).status).toBe(401)
      expect((await call(m.r.adminR.POST, 'POST', '/api/admin/import', { form: csvForm(csv), headers: { 'X-Admin-Token': 'wrong' } })).status).toBe(401)
      const ok = await call(m.r.adminR.POST, 'POST', '/api/admin/import', { form: csvForm(csv), headers: { 'X-Admin-Token': ADMIN } })
      expect(ok.status).toBe(200)
      expect(ok.json.courses).toBe(1)
    })

    it('admin endpoints are disabled when no token is configured', async () => {
      process.env.UCHED_ADMIN_TOKEN = ''
      m.config.resetConfigForTests()
      try {
        const r = await call(m.r.adminR.POST, 'POST', '/api/admin/import', { form: csvForm(HEADER), headers: { 'X-Admin-Token': '' } })
        expect(r.status).toBe(403)
        expect(r.json.code).toBe('ADMIN_DISABLED')
      } finally {
        process.env.UCHED_ADMIN_TOKEN = ADMIN
        m.config.resetConfigForTests()
      }
    })

    it('import reports skipped rows and writes a snapshot', async () => {
      const csv = HEADER + row('CIS 1101', 'Intro', 'A', 'MON', '08:00', '09:00') + 'BAD 1,Bad,3,X,A,J,1ST,2026-2027,10,LECTURE,MON,10:00,09:00,R,C\n'
      const r = await call(m.r.adminR.POST, 'POST', '/api/admin/import', { form: csvForm(csv), headers: { 'X-Admin-Token': ADMIN } })
      expect(r.json.skipped).toBe(1)
      const s = await call(m.r.statusR.GET, 'GET', '/api/catalog/status?semester=1ST&academicYear=2026-2027', { headers: asStudent() })
      expect(s.json).toMatchObject({ available: true, source: 'CSV', fresh: true, courseCount: 1 })
    })

    it('catalog status says unavailable before anything is imported', async () => {
      const s = await call(m.r.statusR.GET, 'GET', '/api/catalog/status?semester=1ST&academicYear=2026-2027', { headers: asStudent() })
      expect(s.json).toMatchObject({ available: false, source: null, courseCount: 0, fresh: false })
    })
  })

  // ---- Import units -----------------------------------------------------------------------------------------

  describe('import units', () => {
    const scraped = (units: number) => {
      const { Course, Section, meeting } = m.domain
      const section = new Section({
        id: null, courseCode: 'CIS 2105', courseName: 'NETWORKING II', units, sectionCode: 'Group 1', instructor: null,
        semester: '1ST', academicYear: '2026-2027', availableSlots: 0,
        meetings: [meeting('LECTURE', 'MON', { start: 15 * 60, end: 17 * 60 + 30 }, null)],
      })
      return new Course({ id: null, code: 'CIS 2105', name: 'NETWORKING II', units, sections: [section] })
    }
    const unitsOf = async () => Number((await m.db.prisma.course.findFirstOrThrow({ where: { studentIdNumber: STUDENT, code: 'CIS 2105' } })).units)
    const importFrom = (units: number, type: string, providesUnits: boolean) =>
      m.importer.importCourses({ type, courses: [scraped(units)], skipped: [], providesUnits }, '1ST', '2026-2027', STUDENT)

    beforeAll(async () => {
      m.domain = await import('@/server/domain/model')
    })

    it('a source without units never overwrites known units', async () => {
      await load('CIS 2105,Networking II,4,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:00,LB 1,Talamban\n')
      await importFrom(3, 'ISMIS', false)
      expect(await unitsOf()).toBe(4)
    })

    it('a brand-new course from such a source gets the default units', async () => {
      await importFrom(3, 'ISMIS', false)
      expect(await unitsOf()).toBe(3)
    })

    it('a source that provides units still updates them', async () => {
      await load('CIS 2105,Networking II,4,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:00,LB 1,Talamban\n')
      await importFrom(5, 'CSV', true)
      expect(await unitsOf()).toBe(5)
    })

    it('re-importing replaces a section\'s meetings instead of piling them up', async () => {
      const csv = row('CIS 2105', 'Networking II', 'A', 'MON', '08:00', '09:00')
      await load(csv)
      await load(csv)
      expect(await m.db.prisma.meeting.count()).toBe(1)
      expect(await m.db.prisma.section.count()).toBe(1)
      expect(await m.db.prisma.course.count()).toBe(1)
    })

    it('shares instructors and rooms across students but never courses', async () => {
      await load(row('CIS 2105', 'Networking II', 'A', 'MON', '08:00', '09:00'))
      await load(row('CIS 2105', 'Networking II', 'A', 'MON', '08:00', '09:00'), '066E164')
      expect(await m.db.prisma.course.count()).toBe(2)
      expect(await m.db.prisma.instructor.count()).toBe(1)
      expect(await m.db.prisma.room.count()).toBe(1)
    })
  })

  // ---- Password hygiene -------------------------------------------------------------------------------------

  describe('password hygiene', () => {
    const sessionBody = (password: string) => `{"username":"student","password":"${password}"}`

    async function everythingStored(): Promise<string> {
      const { prisma } = m.db
      return JSON.stringify([
        await prisma.consentRecord.findMany(),
        await prisma.course.findMany(),
        await prisma.section.findMany(),
        await prisma.instructor.findMany(),
        await prisma.room.findMany(),
        await prisma.catalogSnapshot.findMany(),
      ])
    }

    it('a sentinel password appears in no response, log line or database row (wrong password)', async () => {
      const logs: string[] = []
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...a) => void logs.push(a.map(String).join(' '))))
      try {
        ismis.acceptedPassword = 'something-else'
        const token = await grant()
        const r = await call(m.r.sessionR.POST, 'POST', '/api/ismis/session', { headers: { 'X-Consent-Token': token }, json: sessionBody(SENTINEL) })
        expect(r.status).toBe(401)
        expect(r.json.code).toBe('ISMIS_AUTH_FAILED')
        expect(r.text).not.toContain(SENTINEL)
        expect(logs.join('\n')).not.toContain(SENTINEL)
        expect(await everythingStored()).not.toContain(SENTINEL)
      } finally {
        spies.forEach((s) => s.mockRestore())
      }
    })

    it('a sentinel password never leaks across a session of several searches, and is sent to ISMIS once', async () => {
      const responses: string[] = []
      const logs: string[] = []
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...a) => void logs.push(a.map(String).join(' '))))
      try {
        ismis.acceptedPassword = SENTINEL
        const loginsBefore = ismis.loginPosts()
        const token = await grant()
        const login = await call(m.r.sessionR.POST, 'POST', '/api/ismis/session', { headers: { 'X-Consent-Token': token }, json: sessionBody(SENTINEL) })
        expect(login.status).toBe(200)
        responses.push(login.text)
        const session = login.json.sessionId

        for (const q of ['CIS 2105', 'MATH 1101']) {
          const start = await call(m.r.searchesR.POST, 'POST', '/api/ismis/searches', {
            headers: { 'X-Consent-Token': token, 'X-Ismis-Session': session },
            json: { semester: '1ST', academicYear: '2026-2027', queries: [q] },
          })
          expect(start.status).toBe(202)
          responses.push(start.text)
          for (let i = 0; i < 100; i++) {
            const s = await call(m.r.searchR.GET, 'GET', `/api/ismis/searches/${start.json.jobId}`, { headers: { 'X-Consent-Token': token }, params: { jobId: start.json.jobId } })
            responses.push(s.text)
            if (s.json.status === 'DONE' || s.json.status === 'FAILED') {
              expect(s.json.status).toBe('DONE')
              break
            }
            await new Promise((r) => setTimeout(r, 50))
          }
        }
        expect(responses.join('\n')).not.toContain(SENTINEL)
        expect(logs.join('\n')).not.toContain(SENTINEL)
        expect(await everythingStored()).not.toContain(SENTINEL)
        // The point of the session: two searches, one sign-in, and the password was never sent again.
        expect(ismis.loginPosts() - loginsBefore).toBe(1)
        expect(await m.db.prisma.course.count()).toBe(2)
      } finally {
        spies.forEach((s) => s.mockRestore())
      }
    })

    it('a malformed body is a bad request that does not echo the sentinel', async () => {
      const token = await grant()
      const r = await call(m.r.sessionR.POST, 'POST', '/api/ismis/session', {
        headers: { 'X-Consent-Token': token },
        json: `{"username":"student","password":"${SENTINEL}", oops`,
      })
      expect(r.status).toBe(400)
      expect(r.json.code).toBe('BAD_REQUEST')
      expect(r.text).not.toContain(SENTINEL)
    })

    it('a validation error does not echo the sentinel either', async () => {
      const token = await grant()
      const r = await call(m.r.sessionR.POST, 'POST', '/api/ismis/session', { headers: { 'X-Consent-Token': token }, json: { username: '', password: SENTINEL } })
      expect(r.status).toBe(400)
      expect(r.json.code).toBe('VALIDATION_ERROR')
      expect(r.text).not.toContain(SENTINEL)
    })
  })

  // ---- Prospectus & search jobs -----------------------------------------------------------------------------

  describe('prospectus endpoint', () => {
    it("serves the student's own curriculum over the live connection", async () => {
      ismis.acceptedPassword = 'pw'
      const token = await grant()
      const login = await call(m.r.sessionR.POST, 'POST', '/api/ismis/session', { headers: { 'X-Consent-Token': token }, json: { username: '241F065', password: 'pw' } })
      const r = await call(m.r.prospectusR.GET, 'GET', '/api/ismis/prospectus', { headers: { 'X-Consent-Token': token, 'X-Ismis-Session': login.json.sessionId } })
      expect(r.status).toBe(200)
      expect(r.json.programName).toContain('INFORMATION TECHNOLOGY')
      expect(r.json.courses.map((c: { code: string }) => c.code)).toEqual(expect.arrayContaining(['CIS 1101', 'CIS 2201', 'IT ELEC 3']))
      expect(r.json.courses[0]).toMatchObject({ yearLevel: 1, semester: '1ST', units: 3 })
    })

    it('a busy session refuses a concurrent lease', async () => {
      ismis.acceptedPassword = 'pw'
      const { sessionId: id } = await m.sessions.ismisSessions().login('241F065', 'pw')
      const lease = m.sessions.ismisSessions().lease(id)
      expect(() => m.sessions.ismisSessions().lease(id)).toThrow(/already running/)
      lease.release()
      expect(() => m.sessions.ismisSessions().lease(id)).not.toThrow()
    })
  })

  describe('search jobs', () => {
    const jobs = () => m.jobs.searchJobs()
    const sessions = () => m.sessions.ismisSessions()
    const student = () => `s-${crypto.randomUUID().slice(0, 8)}`
    const signIn = async (id = student()) => {
      ismis.acceptedPassword = 'pw'
      return (await sessions().login(id, 'pw')).sessionId as string
    }
    const submit = (session: string, queries: string[]) => jobs().submit(session, '1ST', '2026-2027', queries) as string
    const finish = async (jobId: string) => {
      for (let i = 0; i < 150; i++) {
        const v = jobs().view(jobId)
        if (v.status === 'DONE' || v.status === 'FAILED') return v
        await new Promise((r) => setTimeout(r, 50))
      }
      throw new Error('job did not finish')
    }

    it('runs searches one by one and one bad code does not stop the rest', async () => {
      const v = await finish(submit(await signIn(), ['CIS 2105', 'nomatch', 'many', 'MATH 1101', 'cis 2105']))
      expect(v.status).toBe('DONE')
      expect(v.items.map((i: { query: string }) => i.query)).toEqual(['CIS 2105', 'nomatch', 'many', 'MATH 1101']) // duplicate ignoring case dropped
      expect(v.items.map((i: { status: string }) => i.status)).toEqual(['DONE', 'NO_RESULTS', 'DONE', 'DONE'])
      expect(v.items[0].found.map((c: { code: string }) => c.code)).toEqual(['CIS 2105', 'MATH 1101'])
      expect(v.items[1].message).toContain('nomatch')
      expect(v.items[2].found.map((c: { code: string }) => c.code)).toEqual(['AA 3101', 'AC 1101', 'AC 1102'])
    })

    it('the same session serves later jobs without signing in again', async () => {
      const session = await signIn()
      const logins = ismis.loginPosts()
      expect((await finish(submit(session, ['CIS 2105']))).status).toBe('DONE')
      expect((await finish(submit(session, ['MATH 1101']))).status).toBe('DONE')
      expect(ismis.loginPosts()).toBe(logins)
    })

    it('rejects an unknown session, an unknown job, and sign-out ends the session at once', async () => {
      expect(() => submit('not-a-real-session-id', ['CIS 2105'])).toThrow(/session has ended/)
      expect(() => jobs().view('nope')).toThrow(/Unknown/)
      const session = await signIn()
      sessions().logout(session)
      expect(() => submit(session, ['CIS 2105'])).toThrow(/session has ended/)
    })

    it('an idle session expires', async () => {
      const session = await signIn()
      process.env.UCHED_ISMIS_SESSION_IDLE_MINUTES = '0'
      m.config.resetConfigForTests()
      try {
        expect(() => submit(session, ['CIS 2105'])).toThrow(/session has ended/)
      } finally {
        delete process.env.UCHED_ISMIS_SESSION_IDLE_MINUTES
        m.config.resetConfigForTests()
      }
    })

    it('signing in again replaces the old session for the same student', async () => {
      const id = student()
      const first = await signIn(id)
      const second = await signIn(id)
      expect(second).not.toBe(first)
      expect(() => submit(first, ['CIS 2105'])).toThrow(/session has ended/)
    })

    it('a wrong password is an authentication failure', async () => {
      ismis.acceptedPassword = 'pw'
      await expect(sessions().login(student(), 'wrong')).rejects.toMatchObject({ code: 'ISMIS_AUTH_FAILED' })
    })

    it('an ended ISMIS session stops the job and asks to sign in again', async () => {
      const session = await signIn()
      ismis.expireSessions() // ISMIS drops the session behind USChed's back
      const v = await finish(submit(session, ['CIS 2105', 'MATH 1101']))
      expect(v.status).toBe('FAILED')
      expect(v.errorCode).toBe('ISMIS_SESSION_EXPIRED')
      expect(v.items.map((i: { status: string }) => i.status)).toEqual(['FAILED', 'SKIPPED'])
      expect(() => submit(session, ['CIS 2105'])).toThrow(/session has ended/)
    })

    it('only one search runs at a time per student', async () => {
      const session = await signIn()
      ismis.mode = 'SLOW'
      const id = submit(session, ['CIS 2105'])
      expect(() => submit(session, ['MATH 1101'])).toThrow(/already/)
      expect((await finish(id)).status).toBe('DONE')
    })

    it('limits how many students scrape at once', async () => {
      ismis.mode = 'SLOW'
      const a = await signIn()
      const b = await signIn()
      const c = await signIn()
      const ids = [submit(a, ['CIS 2105']), submit(b, ['CIS 2105'])]
      expect(() => submit(c, ['CIS 2105'])).toThrow(/busy/)
      for (const id of ids) await finish(id)
      expect((await finish(submit(c, ['CIS 2105']))).status).toBe('DONE')
    })

    it('GE-FREELEC is searched as GE-FEL with no number, and collapses into one course', async () => {
      const v = await finish(submit(await signIn(), ['GE-FREELEC 2']))
      const item = v.items[0]
      expect(v.status).toBe('DONE')
      expect(item.status).toBe('DONE')
      expect(item.query).toBe('GE-FREELEC 2') // shown to the student exactly as they typed it
      expect(item.searchedAs).toBe('GE-FEL') // what actually went to ISMIS, no "2"
      expect(item.courses).toBe(1)
      expect(item.sections).toBe(3)
      expect(item.found.map((c: { code: string }) => c.code)).toEqual(['GE-FEL'])
      const search = ismis.bodies().filter((b) => b.includes('Courses=')).at(-1)!
      expect(search).toContain('Courses=GE-FEL')
      expect(search).not.toContain('FREELEC')
    })

    it('picking a schedule picks which real elective fills the GE-FEL slot', async () => {
      const id = student()
      const found = (await finish(submit(await signIn(id), ['GE-FEL']))).items[0].found
      expect(found).toHaveLength(1)
      const { generateForStudent } = await import('@/server/services/schedules')
      const { NO_PREFERENCE } = await import('@/server/engine/preference')
      const result = await generateForStudent(id, [found[0].id], '1ST', '2026-2027', 10, NO_PREFERENCE, null)
      expect(result.ranked.length).toBeGreaterThan(0)
      const codes = new Set(result.ranked.flatMap((r: { schedule: { sections: readonly { sectionCode: string }[] } }) => r.schedule.sections.map((s) => s.sectionCode)))
      expect([...codes].every((c) => c.startsWith('Group'))).toBe(true)
    })

    it('recognises messy spellings of the family and leaves real codes alone', async () => {
      for (const [typed, searchedAs] of [['GE Free Elec 2', 'GE-FEL'], ['ge-freelec', 'GE-FEL'], ['GE-FEL 2', 'GE-FEL'], ['GE-FEL', null], ['CIS 2105', null]] as const) {
        const v = await finish(submit(await signIn(), [typed]))
        expect(v.items[0].status).toBe('DONE')
        expect(v.items[0].searchedAs).toBe(searchedAs)
      }
    })

    it('a plain no-match gets no suggestions when there is no family to broaden to', async () => {
      const item = (await finish(submit(await signIn(), ['nomatch']))).items[0]
      expect(item.status).toBe('NO_RESULTS')
      expect(item.suggestions).toEqual([])
    })

    it('the short ajax no-results shape is also just no results', async () => {
      const item = (await finish(submit(await signIn(), ['shortnomatch']))).items[0]
      expect(item.status).toBe('NO_RESULTS')
      expect(item.message).not.toMatch(/Could not find|layout/)
    })

    it('resolveAlias handles the known family in any spelling and leaves everything else alone', () => {
      const { resolveAlias } = m.jobs
      expect(resolveAlias('GE-FREELEC 2')).toBe('GE-FEL')
      expect(resolveAlias('ge-freelec 12')).toBe('GE-FEL')
      expect(resolveAlias('GE-FREELEC')).toBe('GE-FEL')
      expect(resolveAlias('GE Free Elec 2')).toBe('GE-FEL')
      expect(resolveAlias('ge free elec')).toBe('GE-FEL')
      expect(resolveAlias('GE-FEL')).toBe('GE-FEL')
      expect(resolveAlias('GE-FEL 2')).toBe('GE-FEL')
      expect(resolveAlias('CIS 2105')).toBe('CIS 2105')
    })

    it('validates the list of queries', async () => {
      const session = await signIn()
      expect(() => submit(session, [' ', ''])).toThrow(/at least one/)
      expect(() => submit(session, ['x'])).toThrow(/2 to 100/)
      expect(() => submit(session, Array.from({ length: 16 }, (_, i) => `CIS ${1000 + i}`))).toThrow(/at most 15/)
    })

    it('searched courses take their real units from the prospectus', async () => {
      const v = await finish(submit(await signIn(), ['CIS 2105']))
      expect(v.status).toBe('DONE')
      const found = v.items[0].found as { code: string; units: number }[]
      // MATH 1101 is in the prospectus at 2 units; CIS 2105 is not, so it keeps the default.
      expect(found.find((c) => c.code === 'MATH 1101')?.units).toBe(2)
      expect(found.find((c) => c.code === 'CIS 2105')?.units).toBe(3)
    })
  })
})

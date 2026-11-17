// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { IsmisLayoutChangedError } from '@/server/errors'
import { academicPeriod, startYear } from '@/server/ismis/connection'
import { campusOf, mapIsmisRows, parseDays, parseSegment } from '@/server/ismis/courseMapper'
import {
  formAction,
  formFields,
  loginFormHiddenFields,
  pageInfo,
  parseProspectus,
  parseResults,
} from '@/server/ismis/parser'
import { rejectChallenge } from '@/server/ismis/session'
import { fixture } from '../support/fakeIsmis'

/** Parser and mapper against fixtures saved in the real ISMIS formats. */
describe('results table parser', () => {
  it('parses the real results table', () => {
    const rows = parseResults(fixture('offered.html'))
    expect(rows).toHaveLength(5) // header, spacer, blank and footer rows are ignored
    expect(rows[0]).toMatchObject({
      courseCode: 'CIS 2105 - Group 1',
      title: 'NETWORKING II',
      status: 'BLOCKSECTION',
      scheduleLines: ['MW 03:00 PM - 05:30 PM LB470TC'],
      enrolled: '24/24',
    })
    expect(rows[1].scheduleLines).toHaveLength(2)
    expect(rows[2].teachers).toEqual(['BARTLETT, EDWIN D.', 'ROA, DORIZ R.'])
  })

  it('treats a short no-table response as genuinely no results, not a layout change', () => {
    // The real ISMIS shape for an empty search: a short ajax fragment, no table at all.
    expect(parseResults('<div class="row" id="CourseScheduleOfferedList"></div>')).toEqual([])
    expect(parseResults('')).toEqual([])
    expect(parseResults(null)).toEqual([])
  })

  it('still reports a large response with no table as a layout change', () => {
    expect(() => parseResults(`<html><body>${'x'.repeat(600)}</body></html>`)).toThrow(IsmisLayoutChangedError)
  })

  it('treats a table with a header but no data rows as a search that matched nothing', () => {
    expect(parseResults('<table><tr><th>CourseCode</th><th>Schedule</th></tr></table>')).toEqual([])
  })
})

describe('course mapper', () => {
  it('builds sections from code and group', () => {
    // The fallback campus passed in is deliberately wrong ("Main"): every room code here ends in "TC",
    // so the room's own suffix must win regardless of whatever default the caller supplies.
    const result = mapIsmisRows(parseResults(fixture('offered.html')), '1ST', '2026-2027', 'Main', 3.0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]).toContain('BAD 1')
    expect(result.courses.map((c) => c.code)).toEqual(['CIS 2105', 'MATH 1101'])

    const net = result.courses[0]
    expect(net.name).toBe('NETWORKING II')
    expect(net.units).toBe(3.0) // the page has no units column, so the default applies
    expect(net.sections.map((s) => s.sectionCode)).toEqual(['Group 1', 'Group 6', 'Group 8'])

    const g1 = net.sections[0]
    expect(g1.meetings.map((m) => m.day)).toEqual(['MON', 'WED'])
    expect(g1.meetings[0].time).toEqual({ start: 15 * 60, end: 17 * 60 + 30 })
    expect(g1.meetings[0].room).toMatchObject({ roomCode: 'LB470TC', campus: 'Talamban' })
    expect(g1.instructor?.name).toBe('SEBIAL, ARCHIVAL J.')
    expect(g1.availableSlots).toBe(0) // 24/24 enrolled is full

    expect(net.sections[1].meetings).toHaveLength(4) // two schedule lines x TTh
    const g8 = net.sections[2]
    expect(g8.instructor?.name).toBe('BARTLETT, EDWIN D. / ROA, DORIZ R.')
    expect(g8.availableSlots).toBe(4)
    expect(g8.meetings[0].type).toBe('LECTURE')
  })

  it('skips a row with an impossible clock time instead of failing the whole search', () => {
    const result = mapIsmisRows(
      [{ row: 1, courseCode: 'X 1 - Group 1', title: 'X', status: null, teachers: [], scheduleLines: ['M 25:00 - 26:00 AB1'], enrolled: null }],
      '1ST',
      '2026-2027',
      'Main',
      3,
    )
    expect(result.courses).toEqual([])
    expect(result.skipped).toHaveLength(1)
  })

  it('understands the schedule grammar', () => {
    expect(parseDays('MWF')).toEqual(['MON', 'WED', 'FRI'])
    expect(parseDays('TTh')).toEqual(['TUE', 'THU'])
    expect(parseDays('S')).toEqual(['SAT'])
    const noon = parseSegment('M 11:00 AM - 01:00 PM', 'C', false)
    expect(noon[0].time).toEqual({ start: 11 * 60, end: 13 * 60 })
    expect(parseSegment('W 07:30 AM - 10:00 AM TBA', 'C', false)[0].room).toBeNull()
    expect(parseSegment('F 12:30 PM - 03:00 PM LB469TC', 'C', false)[0].time.start).toBe(12 * 60 + 30)
  })

  it('lets the room-code suffix decide the campus, not the configured default', () => {
    // USC's two campuses aren't a separate field ISMIS reports - they're a suffix baked into the room
    // code itself, so a room's own "MC"/"TC" always wins over whatever default campus was configured.
    expect(campusOf('LB470TC', 'Main')).toBe('Talamban')
    expect(campusOf('LB201MC', 'Talamban')).toBe('Main')
    expect(campusOf('lb470tc', 'Main')).toBe('Talamban') // case-insensitive
    expect(campusOf('GYM', 'Main')).toBe('Main') // no recognisable suffix: fall back to the default
  })
})

describe('forms and pages', () => {
  it('search form fields include every hidden field and the defaults', () => {
    const html = fixture('search-form.html')
    const fields = formFields(html, 'form#CourseScheduleCourseScheduleOffered')
    expect(fields).toMatchObject({
      'AjaxFormVM.Controller': 'CourseSchedule',
      'AjaxFormVM.Action': 'CourseScheduleOffered',
      __RequestVerificationToken: 'SANITIZED-TOKEN',
      AcademicPeriod: 'NONE',
      Courses: '',
    })
    expect(Object.keys(fields).filter((k) => k.toLowerCase().includes('submit') && !k.startsWith('AjaxFormVM'))).toEqual([])
    expect(formAction(html, 'form#CourseScheduleCourseScheduleOffered')).toBe('/CourseSchedule/CourseScheduleOffered?Length=14')
  })

  it('reads the real and default page-info cases', () => {
    expect(pageInfo(fixture('offered.html'))).toEqual([1, 1])
    expect(pageInfo(fixture('offered-paged-p1.html'))).toEqual([1, 3])
    expect(pageInfo(fixture('offered-paged-p2.html'))).toEqual([2, 3])
    expect(pageInfo('<span>Page 1 of 204</span>')).toEqual([1, 204])
    expect(pageInfo('no page marker here')).toEqual([1, 1])
  })

  it('takes the anti-forgery token from the real login form and does not mistake it for a challenge', () => {
    const login = fixture('login-form.html')
    expect(loginFormHiddenFields(login, 'Password')).toEqual({ __RequestVerificationToken: 'SANITIZED-TOKEN' })
    expect(loginFormHiddenFields(login, 'NoSuchField')).toEqual({})
    expect(() => rejectChallenge(login)).not.toThrow()
    expect(() => rejectChallenge(fixture('search-form.html'))).not.toThrow()
  })

  it('maps semester and year to ISMIS values', () => {
    expect(academicPeriod('1ST')).toBe('FIRST_SEMESTER')
    expect(academicPeriod('2ND')).toBe('SECOND_SEMESTER')
    expect(academicPeriod('SUMMER')).toBe('SUMMER')
    expect(startYear('2026-2027')).toBe('2026')
  })
})

describe('prospectus parser', () => {
  it('parses every year and term with real units', () => {
    const p = parseProspectus(fixture('prospectus.html'))
    expect(p.programName).toBe('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY')
    expect(p.effectiveYear).toBe('2023')
    expect(p.courses).toHaveLength(5)

    expect(p.courses[0]).toMatchObject({ yearLevel: 1, semester: '1ST', code: 'CIS 1101', units: 3, requisiteNote: '' })
    const summer = p.courses.find((c) => c.code === 'CIS 2201')!
    expect(summer).toMatchObject({ semester: 'SUMMER', yearLevel: 1, requisiteNote: 'PREREQUISITE CIS 1204' })
    const elective = p.courses.find((c) => c.code === 'IT ELEC 3')!
    expect(elective).toMatchObject({ yearLevel: 2, requisiteNote: '3RD YEAR STANDING' })
  })

  it('treats empty or unexpected pages as layout changes', () => {
    expect(() => parseProspectus('<html><body>nothing here</body></html>')).toThrow(IsmisLayoutChangedError)
    expect(() => parseProspectus('')).toThrow(IsmisLayoutChangedError)
  })
})

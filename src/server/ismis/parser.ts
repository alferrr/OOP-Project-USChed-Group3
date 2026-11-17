import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { IsmisLayoutChangedError } from '../errors'
import type { Semester } from '../domain/model'

type $ = cheerio.CheerioAPI

/** One unvalidated results row exactly as read from the page. */
export interface IsmisRawCourse {
  row: number
  courseCode: string | null
  title: string | null
  status: string | null
  teachers: string[]
  scheduleLines: string[]
  enrolled: string | null
}

/**
 * One row of the student's own degree-program curriculum (the "Prospectus" page): what they are expected to
 * take, in which year and term, not what is actually offered this term. requisiteNote is free text exactly as
 * ISMIS shows it (e.g. "Prerequisite: CIS 1204", "3rd year standing"); USChed does not enforce it.
 */
export interface ProspectusCourse {
  yearLevel: number
  semester: Semester
  code: string
  title: string
  units: number
  requisiteNote: string
}

export interface Prospectus {
  programName: string
  effectiveYear: string | null
  courses: ProspectusCourse[]
}

const HEADERS = new Map<string, string>()
const alias = (key: string, ...names: string[]) => names.forEach((n) => HEADERS.set(n, key))
alias('code', 'coursecode', 'code', 'subjectcode', 'subject')
alias('title', 'coursedescription', 'coursetitle', 'coursename', 'title', 'description')
alias('status', 'coursestatus', 'status')
alias('teachers', 'teachers', 'teacher', 'instructor', 'instructors', 'faculty')
alias('schedule', 'schedule', 'daystime', 'daytime', 'time')
alias('enrolled', 'enrolledstudents', 'enrolled', 'slots')

const normaliseHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')
const PAGE_OF = /Page\s+(\d+)\s+of\s+(\d+)/i
const PROSPECTUS_HEADER = /^(.+?)\s*Year Level:\s*(\d+)\s*$/i

/**
 * A real, empty search result from ISMIS isn't an empty table - it's a short snippet with no table in it
 * at all (an ajax fragment like "no records found"), well under a real results page's size. Anything that
 * short with no table is treated as "nothing matched", not a layout change; anything bigger with no table
 * genuinely means the page no longer looks like what USChed expects.
 */
const NO_TABLE_MEANS_EMPTY_UNDER_CHARS = 500

const load = (html: string | null | undefined) => cheerio.load(html ?? '')

/** jsoup-style text(): whitespace collapsed to single spaces and trimmed. */
const textOf = ($: $, el: cheerio.Cheerio<Element> | undefined) =>
  el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() : ''

// ---- Results table ----------------------------------------------------------------------------------------

/**
 * Rows of the results table; empty if the table is present but the search matched nothing, or ISMIS's
 * whole response was a short "no results" snippet with no table at all.
 */
export function parseResults(html: string | null | undefined): IsmisRawCourse[] {
  const $ = load(html)
  for (const table of $('table').toArray()) {
    const cols = mapHeader($, table)
    if (cols.has('code') && cols.has('schedule')) return readRows($, table, cols) // may be empty: nothing matched
  }
  if (!html || html.trim().length < NO_TABLE_MEANS_EMPTY_UNDER_CHARS) return []
  throw new IsmisLayoutChangedError('Could not find the offered-courses table.')
}

function mapHeader($: $, table: Element): Map<string, number> {
  const cols = new Map<string, number>()
  const headerRow = $(table).find('tr').first()
  if (!headerRow.length) return cols
  headerRow.find('th, td').each((i, cell) => {
    const key = HEADERS.get(normaliseHeader($(cell).text()))
    if (key && !cols.has(key)) cols.set(key, i)
  })
  return cols
}

function readRows($: $, table: Element, cols: Map<string, number>): IsmisRawCourse[] {
  const rows: IsmisRawCourse[] = []
  let n = 0
  for (const tr of $(table).find('tr').toArray()) {
    n++
    const tds = $(tr).children('td').toArray()
    if (tds.length < 2 || tds.every((td) => $(td).text().trim() === '')) continue
    if ($(tr).parent().is('tfoot')) continue
    rows.push({
      row: n,
      courseCode: cellText($, tds, cols, 'code'),
      title: cellText($, tds, cols, 'title'),
      status: cellText($, tds, cols, 'status'),
      teachers: cellLines($, tds, cols, 'teachers', false),
      scheduleLines: cellLines($, tds, cols, 'schedule', true),
      enrolled: cellText($, tds, cols, 'enrolled'),
    })
  }
  return rows
}

function cellText($: $, tds: Element[], cols: Map<string, number>, key: string): string | null {
  const i = cols.get(key)
  return i === undefined || i >= tds.length ? null : $(tds[i]).text().replace(/\s+/g, ' ').trim()
}

/** Cell content split into lines: one per <span> (schedule) or per <br> (teachers). */
function cellLines($: $, tds: Element[], cols: Map<string, number>, key: string, bySpan: boolean): string[] {
  const i = cols.get(key)
  if (i === undefined || i >= tds.length) return []
  const cell = $(tds[i]).clone()
  const out: string[] = []
  const spans = cell.find('span')
  if (bySpan && spans.length) {
    spans.each((_, span) => addLine(out, $(span).text()))
    return out
  }
  cell.find('br').replaceWith('\n')
  for (const line of cell.text().split('\n')) addLine(out, line)
  return out
}

function addLine(out: string[], raw: string) {
  const line = raw.replace(/\s+/g, ' ').trim()
  if (line) out.push(line)
}

// ---- Prospectus -------------------------------------------------------------------------------------------

/**
 * The student's degree-program curriculum: one h4 header ("1ST Semester / Year Level: 1", or
 * "Summer / Year Level: 1") followed by its table, repeated for the whole program.
 */
export function parseProspectus(html: string | null | undefined): Prospectus {
  const $ = load(html)
  const programName = textOf($, $('h3').first())
  const ey = /Effective Year:\s*(\S+)/i.exec($.root().text().replace(/\s+/g, ' '))
  const effectiveYear = ey ? ey[1] : null

  const courses: ProspectusCourse[] = []
  for (const h4 of $('h4').toArray()) {
    const m = PROSPECTUS_HEADER.exec(textOf($, $(h4)))
    if (!m) continue
    const semester = prospectusSemester(m[1].trim())
    const yearLevel = Number(m[2])
    if (!semester) continue
    const table = $(h4).parent().next()
    if (!table.length || !table.is('table')) continue
    for (const tr of table.find('tbody tr').toArray()) {
      const tds = $(tr).find('td').toArray()
      if (tds.length < 3) continue
      const code = textOf($, $(tds[0]))
      const title = textOf($, $(tds[1]))
      const unitsText = textOf($, $(tds[2]))
      if (!code || !/^\d+(\.\d+)?$/.test(unitsText)) continue
      const requisiteNote = tds.length > 4 ? requisiteNoteOf($, $(tds[4])) : ''
      courses.push({ yearLevel, semester, code, title, units: Number(unitsText), requisiteNote })
    }
  }
  if (courses.length === 0) {
    throw new IsmisLayoutChangedError(`No prospectus entries were found on the ISMIS page (${describeStructure(html)}).`)
  }
  return { programName, effectiveYear, courses }
}

function prospectusSemester(label: string): Semester | null {
  const l = label.toUpperCase()
  if (l.startsWith('SUMMER')) return 'SUMMER'
  if (l.includes('1ST')) return '1ST'
  if (l.includes('2ND')) return '2ND'
  return null
}

/** Joins the requisite cell's spans, dropping blank ones, into one readable line (e.g. "PREREQUISITE CIS 1204"). */
function requisiteNoteOf($: $, cell: cheerio.Cheerio<Element>): string {
  const parts: string[] = []
  cell.find('span').each((_, span) => {
    const t = $(span).text().replace(/ /g, ' ').trim().replace(/,$/, '')
    if (t) parts.push(t)
  })
  return parts.join(' ')
}

// ---- Forms & misc -----------------------------------------------------------------------------------------

/** Href of the first element matching the selector, or null. */
export function linkHref(html: string | null | undefined, cssSelector: string): string | null {
  const href = load(html)(cssSelector).first().attr('href')
  return href && href.trim() ? href : null
}

/**
 * A structure-only summary for error messages (form ids, table column headings, sign-in form present).
 * Never includes cell contents, values, or page text, so it is safe to show and log.
 */
export function describeStructure(html: string | null | undefined): string {
  const $ = load(html)
  const forms = $('form')
    .toArray()
    .map((f) => $(f).attr('id') || '(no id)')
  const tables: string[] = []
  for (const t of $('table').toArray()) {
    const cols = $(t)
      .find('tr')
      .first()
      .find('th, td')
      .toArray()
      .slice(0, 12)
      .map((c) => $(c).text().replace(/\s+/g, ' ').trim())
    tables.push(`[${cols.join(', ')}]`)
    if (tables.length >= 3) break
  }
  const signIn = $('input[type=password]').length > 0
  return `page has ${html?.length ?? 0} chars; forms=[${forms.join(', ')}]; tables=[${tables.join(', ')}]; signInForm=${signIn}`
}

/** {current, total} from "Page 1 of 3"; {1, 1} when the text is absent. */
export function pageInfo(html: string | null | undefined): [number, number] {
  const m = PAGE_OF.exec(load(html).root().text().replace(/\s+/g, ' '))
  return m ? [Number(m[1]), Number(m[2])] : [1, 1]
}

/**
 * Hidden inputs (e.g. ASP.NET's __RequestVerificationToken) of the sign-in form, i.e. the form that
 * contains the password field. They must be echoed back with the login POST.
 */
export function loginFormHiddenFields(html: string | null | undefined, passwordField: string): Record<string, string> {
  const $ = load(html)
  const fields: Record<string, string> = {}
  const form = $('form')
    .toArray()
    .find((f) => $(f).find('input').toArray().some((i) => $(i).attr('name') === passwordField))
  if (form) {
    $(form)
      .find('input[type=hidden][name]')
      .each((_, input) => {
        fields[$(input).attr('name') as string] = $(input).attr('value') ?? ''
      })
  }
  return fields
}

/** Every named field of a form with its current value (hidden inputs, text inputs, selects). */
export function formFields(html: string | null | undefined, formSelector: string): Record<string, string> {
  const $ = load(html)
  const fields: Record<string, string> = {}
  const form = $(formSelector).first()
  if (!form.length) return fields
  form.find('input[name], select[name], textarea[name]').each((_, node) => {
    const e = $(node)
    const name = e.attr('name') as string
    const type = (e.attr('type') ?? '').toLowerCase()
    if (node.tagName === 'select') {
      const chosen = e.find('option[selected]').first().length ? e.find('option[selected]').first() : e.find('option').first()
      fields[name] = chosen.length ? (chosen.attr('value') ?? '') : ''
    } else if (type === 'checkbox' || type === 'radio') {
      if (e.attr('checked') !== undefined) fields[name] = e.attr('value') !== undefined ? (e.attr('value') as string) : 'on'
    } else if (type !== 'submit' && type !== 'button') {
      fields[name] = e.attr('value') ?? ''
    }
  })
  return fields
}

/** The form's action (path and query), or null if the form is missing. */
export function formAction(html: string | null | undefined, formSelector: string): string | null {
  const action = load(html)(formSelector).first().attr('action')
  return action && action.trim() ? action : null
}

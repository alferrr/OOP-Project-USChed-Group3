import { describe, expect, it } from 'vitest'
import type { ProspectusCourse } from '../api/types'
import { checkPrerequisites, codesBefore, parseRequisites } from './prerequisites'

const c = (yearLevel: number, semester: ProspectusCourse['semester'], code: string, requisiteNote = ''): ProspectusCourse =>
  ({ yearLevel, semester, code, title: code, units: 3, requisiteNote })

const courses = [
  c(1, '1ST', 'CIS 1101'),
  c(1, '1ST', 'CIS 1104'),
  c(1, '2ND', 'CIS 1202', 'PREREQUISITE CIS 1101 PREREQUISITE CIS 1104'),
  c(1, 'SUMMER', 'CIS 2201', 'PREREQUISITE CIS 1204'),
  c(2, '1ST', 'IT ELEC 3', '3RD YEAR STANDING'),
]

describe('parseRequisites', () => {
  it('splits several prerequisites and finds none in an empty note', () => {
    expect(parseRequisites('PREREQUISITE CIS 1101 PREREQUISITE CIS 1104').prerequisites).toEqual(['CIS 1101', 'CIS 1104'])
    expect(parseRequisites('')).toEqual({ prerequisites: [], standingYear: null })
  })
  it('reads a year standing without mistaking it for a prerequisite', () => {
    expect(parseRequisites('3RD YEAR STANDING')).toEqual({ prerequisites: [], standingYear: 3 })
  })
})

describe('checkPrerequisites', () => {
  it('lists prerequisites not marked passed, ignoring case and spacing', () => {
    expect(checkPrerequisites('cis  1202', courses, ['CIS 1101'])?.missing).toEqual(['CIS 1104'])
    expect(checkPrerequisites('CIS 1202', courses, ['CIS 1101', 'CIS 1104'])?.missing).toEqual([])
  })
  it('returns the standing requirement and null for courses outside the prospectus', () => {
    expect(checkPrerequisites('IT ELEC 3', courses, [])).toEqual({ missing: [], standingYear: 3 })
    expect(checkPrerequisites('GE-FEL PC', courses, [])).toBeNull()
  })
})

describe('codesBefore', () => {
  it('returns every course in earlier terms, counting summer after 2nd semester', () => {
    expect(codesBefore(courses, 1, '2ND')).toEqual(['CIS 1101', 'CIS 1104'])
    expect(codesBefore(courses, 2, '1ST')).toEqual(['CIS 1101', 'CIS 1104', 'CIS 1202', 'CIS 2201'])
  })
})

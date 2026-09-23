import { describe, expect, it } from 'vitest'
import { familyOf, groupCourses } from './courseGroups'

const course = (id: number, code: string) => ({ id, code, name: code + ' name', units: 3, department: null, prerequisites: null })

describe('familyOf', () => {
  it('recognises the real ISMIS shape: a dash family code, a space, then a letters-only offering abbreviation', () => {
    expect(familyOf('GE-FEL AIS')).toBe('GE-FEL')
    expect(familyOf('GE-FEL AMSR')).toBe('GE-FEL')
    expect(familyOf('GE-FEL BNBCBW')).toBe('GE-FEL')
  })

  it('also recognises a glued digit slot with no space', () => {
    expect(familyOf('GE-FEL1')).toBe('GE-FEL')
    expect(familyOf('GE-FEL12')).toBe('GE-FEL')
  })

  it('recognises the messier real offering suffixes too, whatever shape they take', () => {
    expect(familyOf('GE-FEL DP101')).toBe('GE-FEL') // letters + digits, no separator
    expect(familyOf('GE-FEL LFBBB101')).toBe('GE-FEL')
    expect(familyOf('GE-FEL MH-TBCY')).toBe('GE-FEL') // a dash inside the suffix itself
    expect(familyOf('GE-FEL SBE 01')).toBe('GE-FEL') // a further space inside the suffix
  })

  it('leaves ordinary "DEPT NUMBER" codes alone', () => {
    expect(familyOf('CIS 2105')).toBeNull()
    expect(familyOf('MATH 1101')).toBeNull()
  })

  it('leaves a bare family code (no offering suffix) alone', () => {
    expect(familyOf('GE-FEL')).toBeNull()
  })

  it('leaves a letters-only code with no dash prefix alone (not a known family shape)', () => {
    expect(familyOf('GE ENVI')).toBeNull()
    expect(familyOf('NSTP CWTS')).toBeNull()
  })
})

describe('groupCourses', () => {
  it('collapses 2+ same-family courses into one group row, keeping first-seen order', () => {
    const rows = groupCourses([course(1, 'CIS 2105'), course(2, 'GE-FEL AIS'), course(3, 'MATH 1101'), course(4, 'GE-FEL BFI')])
    expect(rows).toEqual([
      { kind: 'course', course: course(1, 'CIS 2105') },
      { kind: 'group', group: { family: 'GE-FEL', courses: [course(2, 'GE-FEL AIS'), course(4, 'GE-FEL BFI')] } },
      { kind: 'course', course: course(3, 'MATH 1101') },
    ])
  })

  it('groups many real offerings under one family row', () => {
    const codes = ['GE-FEL AIS', 'GE-FEL AMSR', 'GE-FEL BFI', 'GE-FEL BNBCBW', 'GE-FEL CCC', 'GE-FEL CCW', 'GE-FEL CEHDES', 'GE-FEL CLCT']
    const rows = groupCourses(codes.map((c, i) => course(i + 1, c)))
    expect(rows).toEqual([{ kind: 'group', group: { family: 'GE-FEL', courses: codes.map((c, i) => course(i + 1, c)) } }])
  })

  it('leaves a lone family-shaped code as a standalone row', () => {
    const rows = groupCourses([course(1, 'GE-FEL AIS'), course(2, 'CIS 2105')])
    expect(rows).toEqual([
      { kind: 'course', course: course(1, 'GE-FEL AIS') },
      { kind: 'course', course: course(2, 'CIS 2105') },
    ])
  })
})

import { describe, expect, it } from 'vitest'
import type { SearchItem } from '../api/types'
import { addCodes, MAX_CODES, parseCodes, pickCoursesToSelect } from './search'

const item = (query: string, found: SearchItem['found'], status: SearchItem['status'] = 'DONE'): SearchItem => ({
  query, status, message: '', courses: found.length, sections: 0, found, suggestions: [], searchedAs: null,
})
const ref = (id: number, code: string) => ({ id, code, name: code + ' name', units: 3 })

describe('parseCodes', () => {
  it('splits on commas, semicolons and line breaks, trimming and collapsing spaces', () => {
    expect(parseCodes('CIS 2105,  MATH   1101;\nENG 1101\r\n\n , ')).toEqual(['CIS 2105', 'MATH 1101', 'ENG 1101'])
    expect(parseCodes('   ')).toEqual([])
  })
})

describe('addCodes', () => {
  it('ignores duplicates in any case and stops at the limit', () => {
    expect(addCodes(['CIS 2105'], ['cis 2105', 'MATH 1101', 'math 1101'])).toEqual(['CIS 2105', 'MATH 1101'])
    const many = Array.from({ length: 30 }, (_, i) => `CIS ${1000 + i}`)
    expect(addCodes([], many)).toHaveLength(MAX_CODES)
  })
})

describe('pickCoursesToSelect', () => {
  it('selects the result whose code equals what was typed, ignoring case and spacing', () => {
    const picked = pickCoursesToSelect([item('cis2105', [ref(1, 'CIS 2105'), ref(2, 'CIS 2106')])])
    expect(picked.map((c) => c.code)).toEqual(['CIS 2105'])
  })

  it('selects the only course a description search found, but not a broad match', () => {
    expect(pickCoursesToSelect([item('networking', [ref(1, 'CIS 2105')])]).map((c) => c.id)).toEqual([1])
    expect(pickCoursesToSelect([item('CIS', [ref(1, 'CIS 2105'), ref(2, 'CIS 2106')])])).toEqual([])
  })

  it('skips searches that did not succeed and de-duplicates across searches', () => {
    const picked = pickCoursesToSelect([
      item('CIS 2105', [ref(1, 'CIS 2105')]),
      item('CIS 2105', [ref(1, 'CIS 2105')]),
      item('nomatch', [], 'NO_RESULTS'),
      item('many', [ref(9, 'X 1')], 'TOO_MANY'),
    ])
    expect(picked).toHaveLength(1)
  })
})

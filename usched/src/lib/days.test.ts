import { describe, expect, it } from 'vitest'
import { COURSE_COLORS, DAYS } from './days'

describe('days', () => {
  it('lists Monday to Saturday in order', () => {
    expect([...DAYS]).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])
  })
  it('every course color defines bg, border and text', () => {
    for (const c of COURSE_COLORS) expect(Object.keys(c).sort()).toEqual(['bg', 'border', 'text'])
  })
})

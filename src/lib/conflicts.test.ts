import { describe, expect, it } from 'vitest'
import type { Section } from '../api/types'
import { clashesWith, findOverlaps, findTravelRisks } from './conflicts'

const sec = (id: number, code: string, ...meetings: [string, string, string, string?][]): Section => ({
  sectionId: id, courseCode: code, courseName: code, units: 3, sectionCode: 'A', instructorId: null, instructor: null, availableSlots: 30,
  meetings: meetings.map(([day, start, end, room]) => ({ day: day as never, start, end, room: room ?? null, type: 'LECTURE' as const })),
})

describe('findOverlaps', () => {
  it('flags two classes that meet at the same time on the same day', () => {
    const o = findOverlaps([sec(1, 'A 1', ['MON', '08:00', '09:30']), sec(2, 'B 1', ['MON', '09:00', '10:00'])])
    expect(o).toHaveLength(1)
    expect(o[0].text).toMatch(/A 1 and B 1 both meet on Mon/)
  })

  it('does not flag back-to-back classes, other days, or a single class', () => {
    expect(findOverlaps([sec(1, 'A 1', ['MON', '08:00', '09:00']), sec(2, 'B 1', ['MON', '09:00', '10:00'])])).toEqual([])
    expect(findOverlaps([sec(1, 'A 1', ['MON', '08:00', '09:00']), sec(2, 'B 1', ['TUE', '08:00', '09:00'])])).toEqual([])
    expect(findOverlaps([sec(1, 'A 1', ['MON', '08:00', '09:00'])])).toEqual([])
  })
})

describe('findTravelRisks', () => {
  it('flags a campus switch with under 45 minutes between classes', () => {
    const r = findTravelRisks([sec(1, 'A 1', ['MON', '08:00', '09:00', 'R1MC']), sec(2, 'B 1', ['MON', '09:15', '10:00', 'R2TC'])])
    expect(r).toHaveLength(1)
    expect(r[0].gap).toBe(15)
  })

  it('allows a campus switch with enough time, or the same campus back-to-back', () => {
    expect(findTravelRisks([sec(1, 'A 1', ['MON', '08:00', '09:00', 'R1MC']), sec(2, 'B 1', ['MON', '10:00', '11:00', 'R2TC'])])).toEqual([])
    expect(findTravelRisks([sec(1, 'A 1', ['MON', '08:00', '09:00', 'R1MC']), sec(2, 'B 1', ['MON', '09:00', '10:00', 'R2MC'])])).toEqual([])
  })
})

describe('clashesWith', () => {
  it('names the course a section would clash with, or null', () => {
    const picked = [sec(1, 'A 1', ['MON', '08:00', '09:30'])]
    expect(clashesWith(sec(2, 'B 1', ['MON', '09:00', '10:00']), picked)).toBe('A 1')
    expect(clashesWith(sec(3, 'B 1', ['MON', '10:00', '11:00']), picked)).toBeNull()
  })
})

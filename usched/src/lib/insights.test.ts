import { describe, expect, it } from 'vitest'
import type { RankedSchedule, Section } from '../api/types'
import { campusOfRoom, campusOfSection, scheduleInsights } from './insights'

const section = (code: string, room: string | null, start: string, end: string, day: Section['meetings'][number]['day'] = 'MON'): Section => ({
  sectionId: Math.random(), courseCode: code, courseName: code + ' name', units: 3, sectionCode: 'A',
  instructorId: null, instructor: null, availableSlots: null,
  meetings: [{ day, start, end, room, type: 'LECTURE' }],
})

const ranked = (sections: Section[], breakdown: Record<string, number>, schoolDays: number, totalGapMinutes: number): RankedSchedule => ({
  rank: 1, score: 90, breakdown,
  stats: { schoolDays, earliestStart: null, latestEnd: null, totalGapMinutes, totalUnits: 9 },
  sections,
})

describe('campusOfRoom / campusOfSection', () => {
  it('reads the campus off the room code suffix', () => {
    expect(campusOfRoom('LB470TC')).toBe('Talamban')
    expect(campusOfRoom('LB201MC')).toBe('Main')
    expect(campusOfRoom('lb470tc')).toBe('Talamban')
    expect(campusOfRoom('GYM')).toBeNull()
    expect(campusOfRoom(null)).toBeNull()
  })

  it('is whichever campus most of a section\'s own meetings agree on', () => {
    const s = section('A 1', 'LB470TC', '08:00', '09:30')
    s.meetings.push({ day: 'WED', start: '08:00', end: '09:30', room: 'LB470TC', type: 'LECTURE' })
    expect(campusOfSection(s)).toBe('Talamban')
  })
})

describe('scheduleInsights', () => {
  it('flags a single-campus schedule as good', () => {
    const notes = scheduleInsights(ranked(
      [section('A 1', 'LB470TC', '08:00', '09:30'), section('B 1', 'LB471TC', '10:00', '11:30')],
      { LunchBreak: 0.5 }, 1, 30))
    const campus = notes.find((n) => n.key === 'campus')!
    expect(campus.tone).toBe('good')
    expect(campus.text).toContain('All 2 of your classes are on the Talamban campus.')
  })

  it('flags a mixed-campus schedule as a caution, naming the stray count', () => {
    const notes = scheduleInsights(ranked(
      [section('A 1', 'LB470TC', '08:00', '09:30'), section('B 1', 'LB471TC', '10:00', '11:30'), section('C 1', 'SB201MC', '13:00', '14:30')],
      { LunchBreak: 0.5 }, 1, 30))
    const campus = notes.find((n) => n.key === 'campus')!
    expect(campus.tone).toBe('caution')
    expect(campus.text).toContain('Mostly Talamban (2 of 3 classes)')
  })

  it('says nothing about campus when no room has a recognisable campus suffix', () => {
    const notes = scheduleInsights(ranked([section('A 1', null, '08:00', '09:30')], {}, 1, 0))
    expect(notes.find((n) => n.key === 'campus')).toBeUndefined()
  })

  it('praises a real lunch break every day and warns when there is none', () => {
    const base = [section('A 1', null, '08:00', '09:30')]
    expect(scheduleInsights(ranked(base, { LunchBreak: 1 }, 1, 0)).find((n) => n.key === 'lunch')!.tone).toBe('good')
    expect(scheduleInsights(ranked(base, { LunchBreak: 0 }, 1, 0)).find((n) => n.key === 'lunch')!.tone).toBe('caution')
    expect(scheduleInsights(ranked(base, { LunchBreak: 0.5 }, 1, 0)).find((n) => n.key === 'lunch')).toBeUndefined()
  })

  it('calls out zero gaps and a lot of gaps, but stays quiet in between', () => {
    const base = [section('A 1', null, '08:00', '09:30')]
    expect(scheduleInsights(ranked(base, {}, 1, 0)).find((n) => n.key === 'gaps')!.tone).toBe('good')
    expect(scheduleInsights(ranked(base, {}, 1, 200)).find((n) => n.key === 'gaps')!.tone).toBe('caution')
    expect(scheduleInsights(ranked(base, {}, 1, 60)).find((n) => n.key === 'gaps')).toBeUndefined()
  })

  it('calls out a compact week and a wall-to-wall week', () => {
    const base = [section('A 1', null, '08:00', '09:30')]
    expect(scheduleInsights(ranked(base, {}, 2, 0)).find((n) => n.key === 'days')!.tone).toBe('good')
    expect(scheduleInsights(ranked(base, {}, 6, 0)).find((n) => n.key === 'days')!.tone).toBe('caution')
    expect(scheduleInsights(ranked(base, {}, 4, 0)).find((n) => n.key === 'days')).toBeUndefined()
  })

  it('notes a clearly one-sided morning/afternoon schedule but stays quiet on a mixed one', () => {
    const morning = [section('A 1', null, '08:00', '09:30'), section('B 1', null, '09:30', '11:00')]
    const afternoon = [section('A 1', null, '13:00', '14:30'), section('B 1', null, '15:00', '16:30')]
    const mixed = [section('A 1', null, '08:00', '09:30'), section('B 1', null, '13:00', '14:30')]
    expect(scheduleInsights(ranked(morning, {}, 1, 0)).find((n) => n.key === 'morning')!.text).toContain('Mostly morning')
    expect(scheduleInsights(ranked(afternoon, {}, 1, 0)).find((n) => n.key === 'morning')!.text).toContain('afternoon/evening')
    expect(scheduleInsights(ranked(mixed, {}, 1, 0)).find((n) => n.key === 'morning')).toBeUndefined()
  })

  it('ignores an afternoon-preference-flipped Morning score and reads the actual meeting times instead', () => {
    // A schedule that is truly all-afternoon, even if the backend's own (preference-inverted) score says 1.0.
    const afternoon = [section('A 1', null, '13:00', '14:30'), section('B 1', null, '15:00', '16:30')]
    const notes = scheduleInsights(ranked(afternoon, { Morning: 1.0 }, 1, 0))
    expect(notes.find((n) => n.key === 'morning')!.text).toContain('afternoon/evening')
  })
})

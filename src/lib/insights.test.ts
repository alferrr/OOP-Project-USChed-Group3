import { describe, expect, it } from 'vitest'
import type { RankedSchedule, Section } from '../api/types'
import { campusOfRoom, campusOfSection, scheduleInsights } from './insights'

const section = (code: string, room: string | null, start: string, end: string, day: Section['meetings'][number]['day'] = 'MON'): Section => ({
  sectionId: Math.random(), courseCode: code, courseName: code + ' name', units: 3, sectionCode: 'A',
  instructorId: null, instructor: null, availableSlots: null,
  meetings: [{ day, start, end, room, type: 'LECTURE' }],
})

const ranked = (
  sections: Section[], breakdown: Record<string, number>, schoolDays: number, totalGapMinutes: number,
  extra: Partial<Pick<RankedSchedule['stats'], 'earliestStart' | 'latestEnd'>> = {},
): RankedSchedule => ({
  rank: 1, score: 90, breakdown,
  stats: { schoolDays, earliestStart: null, latestEnd: null, totalUnits: 9, ...extra, totalGapMinutes },
  sections,
})

const withSlots = (s: Section, availableSlots: number): Section => ({ ...s, availableSlots })

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

  it('flags a day that runs open-to-close for 8+ hours, but stays quiet on a shorter one', () => {
    const longDay = [section('A 1', null, '07:00', '12:00'), section('B 1', null, '13:00', '16:00')] // 9h span
    const shortDay = [section('A 1', null, '07:00', '09:00'), section('B 1', null, '10:00', '12:00')] // 5h span
    const long = scheduleInsights(ranked(longDay, {}, 1, 0)).find((n) => n.key === 'longday')!
    expect(long.tone).toBe('caution')
    expect(long.text).toContain('Mon runs')
    expect(scheduleInsights(ranked(shortDay, {}, 1, 0)).find((n) => n.key === 'longday')).toBeUndefined()
  })

  it('flags a very early start and a very late end', () => {
    const base = [section('A 1', null, '08:00', '09:00')]
    expect(scheduleInsights(ranked(base, {}, 1, 0, { earliestStart: '06:30' })).find((n) => n.key === 'early')!.tone).toBe('caution')
    expect(scheduleInsights(ranked(base, {}, 1, 0, { earliestStart: '07:30' })).find((n) => n.key === 'early')).toBeUndefined()
    expect(scheduleInsights(ranked(base, {}, 1, 0, { latestEnd: '20:30' })).find((n) => n.key === 'late')!.tone).toBe('caution')
    expect(scheduleInsights(ranked(base, {}, 1, 0, { latestEnd: '18:00' })).find((n) => n.key === 'late')).toBeUndefined()
  })

  it('warns about a section running low on slots, naming the worst one first', () => {
    const tight = [withSlots(section('IT 3101N', null, '08:00', '09:00'), 2), withSlots(section('CIS 2101', null, '10:00', '11:00'), 40)]
    const note = scheduleInsights(ranked(tight, {}, 1, 0)).find((n) => n.key === 'slots')!
    expect(note.tone).toBe('caution')
    expect(note.text).toContain('IT 3101N')
    expect(note.text).toContain('only 2 slots left')
  })

  it('calls a 0-slot section already full, and mentions other tight sections without repeating them all', () => {
    const many = [
      withSlots(section('IT 3101N', null, '08:00', '09:00'), 0),
      withSlots(section('CIS 2101', null, '10:00', '11:00'), 1),
      withSlots(section('MATH 1101', null, '12:00', '13:00'), 3),
    ]
    const note = scheduleInsights(ranked(many, {}, 1, 0)).find((n) => n.key === 'slots')!
    expect(note.text).toContain('is already full')
    expect(note.text).toContain('2 other sections running low')
  })

  it('says nothing about slots when every section has plenty of room', () => {
    const roomy = [withSlots(section('A 1', null, '08:00', '09:00'), 40)]
    expect(scheduleInsights(ranked(roomy, {}, 1, 0)).find((n) => n.key === 'slots')).toBeUndefined()
  })

  it('flags a real back-to-back campus switch with too little travel time, naming both classes', () => {
    // The exact reported case: IT 3101N (Talamban) ends right as TPE 2103 (Main) starts - 0 minutes to travel.
    const noTime = [
      section('IT 3101N', 'LB486TC', '07:30', '09:00'),
      section('TPE 2103', 'ABSPMC', '09:00', '10:00'),
    ]
    const note = scheduleInsights(ranked(noTime, {}, 1, 0)).find((n) => n.key === 'commute')!
    expect(note.tone).toBe('caution')
    expect(note.text).toContain('IT 3101N ends 9:00 AM (Talamban)')
    expect(note.text).toContain('TPE 2103 starts 9:00 AM (Main)')
    expect(note.text).toContain('only 0 minutes to get between campuses')
  })

  it('says nothing when the same-campus switch has a real gap', () => {
    const enoughTime = [
      section('IT 3101N', 'LB486TC', '07:30', '09:00'),
      section('TPE 2103', 'ABSPMC', '09:45', '10:45'),
    ]
    expect(scheduleInsights(ranked(enoughTime, {}, 1, 0)).find((n) => n.key === 'commute')).toBeUndefined()
  })

  it('says nothing for a same-campus back-to-back, or when a room is unknown', () => {
    const sameCampus = [section('A 1', 'LB486TC', '07:30', '09:00'), section('B 1', 'LB467TC', '09:00', '10:00')]
    expect(scheduleInsights(ranked(sameCampus, {}, 1, 0)).find((n) => n.key === 'commute')).toBeUndefined()
    const unknownRoom = [section('A 1', 'LB486TC', '07:30', '09:00'), section('B 1', null, '09:00', '10:00')]
    expect(scheduleInsights(ranked(unknownRoom, {}, 1, 0)).find((n) => n.key === 'commute')).toBeUndefined()
  })

  it('picks the tightest collision first and mentions the rest without repeating them all', () => {
    const threeRisks = [
      section('A 1', 'LB486TC', '07:30', '09:00'),
      section('B 1', 'ABSPMC', '09:00', '10:00'), // 0 min gap
      section('C 1', 'LB467TC', '10:00', '11:00'),
      section('D 1', 'JW340MC', '11:20', '12:00'), // 20 min gap, still under 45
    ]
    // Every adjacent campus switch here is under the 45-min floor: A->B, B->C, and C->D - 3 in total.
    const note = scheduleInsights(ranked(threeRisks, {}, 1, 0)).find((n) => n.key === 'commute')!
    expect(note.text).toContain('only 0 minutes')
    expect(note.text).toContain('2 more spots like this')
  })
})

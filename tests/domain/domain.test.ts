// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { Schedule } from '@/server/domain/model'
import { durationMinutes, overlaps, rangeOf } from '@/server/domain/time'
import { InvalidCourseDataError, InvalidTimeRangeError, MissingScheduleInfoError } from '@/server/errors'
import { lab, lecture, section } from '../support/fixtures'
import { meetingsConflict } from '@/server/domain/model'

describe('TimeRange', () => {
  it('rejects start not before end', () => {
    expect(() => rangeOf('09:00', '09:00')).toThrow(InvalidTimeRangeError)
    expect(() => rangeOf('10:00', '09:00')).toThrow(InvalidTimeRangeError)
  })

  it('detects overlap in every arrangement', () => {
    expect(overlaps(rangeOf('08:00', '09:30'), rangeOf('09:00', '10:30'))).toBe(true)
    expect(overlaps(rangeOf('09:00', '10:30'), rangeOf('08:00', '09:30'))).toBe(true)
    expect(overlaps(rangeOf('08:00', '12:00'), rangeOf('09:00', '10:00'))).toBe(true)
  })

  it('treats adjacent ranges as not overlapping', () => {
    expect(overlaps(rangeOf('08:00', '09:30'), rangeOf('09:30', '11:00'))).toBe(false)
  })

  it('computes duration', () => {
    expect(durationMinutes(rangeOf('08:00', '09:30'))).toBe(90)
  })
})

describe('conflicts and encapsulation', () => {
  it('same-day overlap conflicts', () => {
    expect(meetingsConflict(lecture('MON', '08:00', '09:30'), lecture('MON', '09:00', '10:30'))).toBe(true)
  })

  it('adjacent and different-day meetings do not conflict', () => {
    expect(meetingsConflict(lecture('MON', '08:00', '09:30'), lecture('MON', '09:30', '11:00'))).toBe(false)
    expect(meetingsConflict(lecture('MON', '08:00', '09:30'), lecture('TUE', '08:00', '09:30'))).toBe(false)
  })

  it('a lecture conflicts with an overlapping lab', () => {
    expect(meetingsConflict(lecture('MON', '08:00', '09:30'), lab('MON', '09:00', '10:00'))).toBe(true)
  })

  it('multi-meeting sections conflict on any meeting', () => {
    const a = section('CIS 1', 'A', lecture('MON', '08:00', '09:30'), lecture('WED', '08:00', '09:30'))
    const b = section('MATH 1', 'A', lecture('TUE', '08:00', '09:30'), lecture('WED', '09:00', '10:00'))
    expect(a.conflictsWith(b)).toBe(true)
  })

  it('meeting types are LECTURE and LAB', () => {
    expect(lecture('MON', '08:00', '09:00').type).toBe('LECTURE')
    expect(lab('MON', '10:00', '11:00').type).toBe('LAB')
  })

  it('section meetings cannot be modified', () => {
    const s = section('CIS 1', 'A', lecture('MON', '08:00', '09:00'))
    expect(() => (s.meetings as unknown[]).push(lecture('TUE', '08:00', '09:00'))).toThrow(TypeError)
  })

  it('a schedule is immutable even if its source list changes', () => {
    const s = section('CIS 1', 'A', lecture('MON', '08:00', '09:00'))
    const source = [s]
    const schedule = Schedule.of(source)
    source.length = 0
    expect(schedule.sections).toHaveLength(1)
    expect(() => (schedule.sections as unknown[]).splice(0)).toThrow(TypeError)
  })

  it('invalid state cannot be constructed', () => {
    expect(() => section('CIS 1', 'A')).toThrow(MissingScheduleInfoError)
    expect(() => section(' ', 'A', lecture('MON', '08:00', '09:00'))).toThrow(InvalidCourseDataError)
  })

  it('computes schedule stats', () => {
    const s = Schedule.of([
      section('A 1', 'A', lecture('MON', '08:00', '09:00')),
      section('B 1', 'A', lecture('MON', '10:00', '11:00'), lecture('TUE', '13:00', '14:00')),
    ])
    expect(s.hasConflict()).toBe(false)
    expect(s.schoolDays()).toEqual(['MON', 'TUE'])
    expect(s.earliestStart()).toBe(8 * 60)
    expect(s.latestEnd()).toBe(14 * 60)
    expect(s.totalGapMinutes()).toBe(60)
    expect(s.totalUnits()).toBe(6)
  })
})

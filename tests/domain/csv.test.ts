// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readCsvCourses } from '@/server/datasource/csv'
import { DataSourceError } from '@/server/errors'

const HEADER = 'course_code,course_name,units,department,section_code,instructor,semester,academic_year,available_slots,meeting_type,day,start_time,end_time,room,campus\n'

describe('readCsvCourses', () => {
  it('groups rows into courses, sections and meetings', () => {
    const csv =
      HEADER +
      'CIS 2201,Systems Analysis,3,DCISM,A,Juan Dela Cruz,1ST,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n' +
      'CIS 2201,Systems Analysis,3,DCISM,A,Juan Dela Cruz,1ST,2026-2027,40,LECTURE,WED,08:00,09:30,LB 201,Talamban\n' +
      'CIS 2201,Systems Analysis,3,DCISM,A,Juan Dela Cruz,1ST,2026-2027,40,LAB,SAT,13:00,16:00,LAB 1,Talamban\n'
    const { courses, type, providesUnits } = readCsvCourses(csv, '1ST', '2026-2027')
    expect(type).toBe('CSV')
    expect(providesUnits).toBe(true)
    expect(courses).toHaveLength(1)
    expect(courses[0].department).toBe('DCISM')
    const section = courses[0].sections[0]
    expect(section.meetings).toHaveLength(3)
    expect(section.meetings[2].type).toBe('LAB')
    expect(section.meetings[2].room).toMatchObject({ roomCode: 'LAB 1', campus: 'Talamban' })
  })

  it('skips and reports invalid rows instead of failing', () => {
    const csv =
      HEADER +
      'CIS 2201,Systems Analysis,3,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n' +
      'CIS 2202,Bad Times,3,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,10:00,09:00,LB 201,Talamban\n' +
      'CIS 2203,Bad Units,zero,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n' +
      'CIS 2204,Bad Day,3,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,FUNDAY,08:00,09:30,LB 201,Talamban\n'
    const { courses, skipped } = readCsvCourses(csv, '1ST', '2026-2027')
    expect(courses.map((c) => c.code)).toEqual(['CIS 2201'])
    expect(skipped).toHaveLength(3)
  })

  it('filters out other terms', () => {
    const csv = HEADER + 'CIS 2201,Systems Analysis,3,DCISM,A,Juan,2ND,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n'
    expect(readCsvCourses(csv, '1ST', '2026-2027').courses).toEqual([])
  })

  it('treats an empty CSV as no courses, and a file with no header at all as a data-source error', () => {
    expect(readCsvCourses(HEADER, '1ST', '2026-2027').courses).toEqual([])
    expect(() => readCsvCourses('', '1ST', '2026-2027')).toThrow(DataSourceError)
  })

  it('tolerates padded headers and values', () => {
    const csv =
      ' course_code , course_name ,units,department,section_code,instructor,semester,academic_year,available_slots,meeting_type,day,start_time,end_time,room,campus\n' +
      ' CIS 2201 , Systems Analysis ,3,DCISM,A,,1ST,2026-2027,,LECTURE, mon ,8:00,9:30,,\n'
    const { courses, skipped } = readCsvCourses(csv, null, null)
    expect(skipped).toEqual([])
    expect(courses[0].code).toBe('CIS 2201')
    expect(courses[0].sections[0].instructor).toBeNull()
    expect(courses[0].sections[0].availableSlots).toBeNull()
    expect(courses[0].sections[0].meetings[0].room).toBeNull()
  })
})

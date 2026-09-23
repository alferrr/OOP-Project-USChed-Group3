import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Section } from '../../api/types'
import WeeklyCalendar, { gridBounds, layoutBlocks } from './WeeklyCalendar'

const sections: Section[] = [
  {
    sectionId: 1, courseCode: 'CIS 2201', courseName: 'Systems Analysis', units: 3, sectionCode: 'A',
    instructorId: 1, instructor: 'Juan Dela Cruz', availableSlots: 40,
    meetings: [
      { day: 'MON', start: '08:00', end: '09:30', room: 'LB 201', type: 'LECTURE' },
      { day: 'WED', start: '08:00', end: '09:30', room: 'LB 201', type: 'LECTURE' },
    ],
  },
  {
    sectionId: 2, courseCode: 'MATH 1101', courseName: 'Calculus', units: 3, sectionCode: 'B',
    instructorId: null, instructor: null, availableSlots: null,
    meetings: [{ day: 'MON', start: '10:00', end: '11:00', room: null, type: 'LECTURE' }],
  },
]

describe('WeeklyCalendar', () => {
  it('positions blocks from the grid start using 30-minute rows', () => {
    const blocks = layoutBlocks(sections, 420) // grid starts 7:00
    const first = blocks.find((b) => b.key === '1-0')!
    expect(first.top).toBe(2 * 28) // 8:00 is two rows below 7:00
    expect(first.height).toBe(3 * 28) // 90 minutes is three rows
    expect(blocks.find((b) => b.code === 'MATH 1101')!.colorIndex).toBe(1)
  })

  it('extends the grid for early and late classes', () => {
    expect(gridBounds(sections)).toEqual({ startMin: 420, endMin: 1080 })
    const late: Section[] = [{ ...sections[0], meetings: [{ day: 'FRI', start: '06:00', end: '20:30', room: null, type: 'LECTURE' }] }]
    expect(gridBounds(late)).toEqual({ startMin: 360, endMin: 1260 })
  })

  it('renders each meeting in its own day column', () => {
    render(<WeeklyCalendar sections={sections} />)
    expect(within(screen.getByTestId('col-MON')).getAllByTestId('block')).toHaveLength(2)
    expect(within(screen.getByTestId('col-WED')).getAllByTestId('block')).toHaveLength(1)
    expect(within(screen.getByTestId('col-TUE')).queryAllByTestId('block')).toHaveLength(0)
    expect(screen.getAllByText('CIS 2201 · A')).toHaveLength(2)
  })
})

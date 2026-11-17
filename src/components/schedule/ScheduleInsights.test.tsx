import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RankedSchedule, Section } from '../../api/types'
import ScheduleInsights from './ScheduleInsights'

const section = (code: string, room: string | null, start: string, end: string): Section => ({
  sectionId: Math.random(), courseCode: code, courseName: code + ' name', units: 3, sectionCode: 'A',
  instructorId: null, instructor: null, availableSlots: null,
  meetings: [{ day: 'MON', start, end, room, type: 'LECTURE' }],
})

const schedule = (sections: Section[], breakdown: Record<string, number>, schoolDays: number, totalGapMinutes: number): RankedSchedule => ({
  rank: 1, score: 90, breakdown,
  stats: { schoolDays, earliestStart: null, latestEnd: null, totalGapMinutes, totalUnits: 9 },
  sections,
})

describe('ScheduleInsights', () => {
  it('renders a "Smart analysis" heading with the notes it finds', () => {
    render(<ScheduleInsights schedule={schedule(
      [section('A 1', 'LB470TC', '08:00', '09:30')], { LunchBreak: 1 }, 1, 0,
    )} />)
    expect(screen.getByText('Smart analysis')).toBeInTheDocument()
    expect(screen.getByText(/All 1 of your classes are on the Talamban campus/)).toBeInTheDocument()
    expect(screen.getByText('Every school day has a real lunch break.')).toBeInTheDocument()
    expect(screen.getByText('No idle time at all - every day is fully back-to-back.')).toBeInTheDocument()
  })

  it('renders nothing when there is nothing notable to say', () => {
    const { container } = render(<ScheduleInsights schedule={schedule(
      [section('A 1', null, '09:00', '10:30'), section('B 1', null, '13:00', '14:30')], { LunchBreak: 0.5 }, 4, 60,
    )} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('splits good news from things to watch out for into their own groups', () => {
    render(<ScheduleInsights schedule={schedule(
      // Lunch break every day (good) alongside a campus mix (caution).
      [section('A 1', 'LB470TC', '08:00', '09:30'), section('B 1', 'SB201MC', '13:00', '14:30')],
      { LunchBreak: 1 }, 1, 0,
    )} />)
    expect(screen.getByText('At a glance')).toBeInTheDocument()
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.getByText('Every school day has a real lunch break.')).toBeInTheDocument()
    expect(screen.getByText(/budget travel time between them/)).toBeInTheDocument()
  })

  it('shows only the relevant group when everything found is one-sided', () => {
    render(<ScheduleInsights schedule={schedule(
      [section('A 1', 'LB470TC', '08:00', '09:30')], { LunchBreak: 1 }, 1, 0,
    )} />)
    expect(screen.getByText('At a glance')).toBeInTheDocument()
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument()
  })
})

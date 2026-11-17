import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { encodeSchedule } from '../lib/shareSchedule'
import SharedSchedulePage from './SharedSchedulePage'

const section = {
  sectionId: 1, courseCode: 'CIS 2105', courseName: 'Networking II', units: 3, sectionCode: 'A',
  instructorId: null, instructor: 'Dr. Cruz', availableSlots: null,
  meetings: [{ day: 'MON' as const, start: '08:00', end: '09:30', room: 'LB 1', type: 'LECTURE' as const }],
}

const renderAt = (hash: string) => {
  window.location.hash = hash
  return render(<SharedSchedulePage />)
}

describe('SharedSchedulePage', () => {
  it('shows a shared schedule without needing a sign-in', () => {
    renderAt('#' + encodeSchedule({ semester: '1ST', academicYear: '2026-2027', sections: [section] }))
    expect(screen.getByText(/CIS 2105 · Section A/)).toBeInTheDocument()
    expect(screen.getByText(/1st Semester, A\.Y\. 2026-2027/)).toBeInTheDocument()
  })

  it('explains a link that is not a valid schedule', () => {
    renderAt('#garbage')
    expect(screen.getByText(/doesn't contain a valid schedule/i)).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ComparisonTable from './ComparisonTable'

describe('ComparisonTable', () => {
  it('shows the metrics from the server without recomputing them', () => {
    render(<ComparisonTable ranks={[1, 3]} items={[
      { score: 96, breakdown: {}, stats: { schoolDays: 3, earliestStart: '08:00', latestEnd: '15:00', totalGapMinutes: 30, totalUnits: 12 } },
      { score: 71.5, breakdown: {}, stats: { schoolDays: 5, earliestStart: '07:30', latestEnd: '17:30', totalGapMinutes: 0, totalUnits: 12 } },
    ]} />)
    expect(screen.getByText('Schedule #1')).toBeInTheDocument()
    expect(screen.getByText('Schedule #3')).toBeInTheDocument()
    expect(screen.getByText('96.0')).toBeInTheDocument()
    expect(screen.getByText('30m')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.getByText('96.0').closest('td')).toHaveClass('font-bold')
  })
})

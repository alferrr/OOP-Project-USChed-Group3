import { totalUnits } from '../../lib/units'

export default function UnitsSummary({ units }: { units: number[] }) {
  return (
    <p className="text-sm text-green-900">
      <span className="text-2xl font-bold text-green-800">{totalUnits(units)}</span> total units
      <span className="text-green-900/60"> · {units.length} {units.length === 1 ? 'course' : 'courses'}</span>
    </p>
  )
}

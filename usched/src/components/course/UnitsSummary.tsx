import { totalUnits } from '../../lib/units'

export default function UnitsSummary({ units }: { units: number[] }) {
  return (
    <p className="flex items-baseline gap-2 text-white">
      <span key={totalUnits(units)} className="rise inline-block text-5xl font-extrabold leading-none tracking-tight">{totalUnits(units)}</span>
      <span className="text-base font-semibold">total units</span>
      <span className="text-sm text-white/70">· {units.length} {units.length === 1 ? 'course' : 'courses'}</span>
    </p>
  )
}

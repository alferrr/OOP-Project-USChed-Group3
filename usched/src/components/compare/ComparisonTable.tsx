import type { CompareItem } from '../../api/types'
import { formatMinutes, format12 } from '../../lib/time'

interface Props {
  ranks: number[]
  items: CompareItem[]
}

export default function ComparisonTable({ ranks, items }: Props) {
  const bestScore = Math.max(...items.map((i) => i.score))
  const rows: { label: string; cell: (i: CompareItem) => string }[] = [
    { label: 'Score', cell: (i) => i.score.toFixed(1) },
    { label: 'School days', cell: (i) => String(i.stats.schoolDays) },
    { label: 'Earliest class', cell: (i) => (i.stats.earliestStart ? format12(i.stats.earliestStart) : '-') },
    { label: 'Latest class', cell: (i) => (i.stats.latestEnd ? format12(i.stats.latestEnd) : '-') },
    { label: 'Total units', cell: (i) => String(i.stats.totalUnits) },
    { label: 'Total gap time', cell: (i) => formatMinutes(i.stats.totalGapMinutes) },
  ]
  return (
    <div className="surface overflow-x-auto p-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-green-900/70">
            <th className="px-4 py-3 text-left font-semibold"><span className="sr-only">Measure</span></th>
            {ranks.map((r) => <th key={r} className="px-4 py-3 text-left font-bold text-green-900">Schedule #{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="odd:bg-green-50 [&>*:first-child]:rounded-l-xl [&>*:last-child]:rounded-r-xl">
              <th scope="row" className="px-4 py-3 text-left font-semibold text-green-900">{row.label}</th>
              {items.map((item, i) => (
                <td key={i} className={`px-4 py-3 ${row.label === 'Score' && item.score === bestScore ? 'rounded-xl bg-gold-400 font-bold' : ''}`}>
                  {row.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

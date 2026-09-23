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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-green-800 text-white">
            <th className="px-3 py-2 text-left font-medium" />
            {ranks.map((r) => <th key={r} className="px-3 py-2 text-left font-medium">Schedule #{r}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-green-100">
              <th scope="row" className="px-3 py-2 text-left font-medium text-green-900">{row.label}</th>
              {items.map((item, i) => (
                <td key={i} className={`px-3 py-2 ${row.label === 'Score' && item.score === bestScore ? 'bg-gold-100 font-bold' : ''}`}>
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

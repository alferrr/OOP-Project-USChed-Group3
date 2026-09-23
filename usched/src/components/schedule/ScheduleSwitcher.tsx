import type { RankedSchedule } from '../../api/types'
import ScoreBadge from './ScoreBadge'

interface Props {
  schedules: RankedSchedule[]
  activeIndex: number
  compareRanks: number[]
  onSelect: (i: number) => void
  onToggleCompare: (rank: number) => void
}

export default function ScheduleSwitcher({ schedules, activeIndex, compareRanks, onSelect, onToggleCompare }: Props) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Ranked schedules">
      {schedules.map((s, i) => (
        <li key={s.rank} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
          i === activeIndex ? 'border-green-700 bg-green-50' : 'border-green-100 bg-white'}`}>
          <button onClick={() => onSelect(i)} aria-current={i === activeIndex} className="flex items-center gap-2 text-sm font-medium text-green-900">
            #{s.rank} <ScoreBadge score={s.score} />
          </button>
          <label className="flex items-center gap-1 text-xs text-green-900/70">
            <input type="checkbox" className="accent-green-700" checked={compareRanks.includes(s.rank)}
              disabled={!compareRanks.includes(s.rank) && compareRanks.length >= 4}
              onChange={() => onToggleCompare(s.rank)} aria-label={`Compare schedule ${s.rank}`} />
            compare
          </label>
        </li>
      ))}
    </ul>
  )
}

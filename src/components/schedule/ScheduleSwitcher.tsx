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
    <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Ranked schedules">
      {schedules.map((s, i) => {
        const checked = compareRanks.includes(s.rank)
        const blocked = !checked && compareRanks.length >= 4
        return (
          <li key={s.rank} className="flex shrink-0 items-center gap-1.5">
            <button onClick={() => onSelect(i)} aria-current={i === activeIndex}
              className={`flex items-center gap-2 rounded-full py-2.5 pl-5 pr-4 text-sm font-bold transition-all duration-300 ${
                i === activeIndex ? 'bg-green-700 text-white shadow-[var(--shadow-lift)]' : 'surface text-green-900 hover:bg-green-50'}`}>
              #{s.rank} <ScoreBadge score={s.score} />
            </button>
            <label className={`relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors ${
              checked ? 'bg-gold-400 text-green-900' : 'bg-green-100 text-green-800 hover:bg-green-200'} ${blocked ? 'cursor-not-allowed opacity-45' : ''}`}>
              <input type="checkbox" className="peer absolute inset-0 size-full cursor-[inherit] appearance-none rounded-full" checked={checked}
                disabled={blocked} onChange={() => onToggleCompare(s.rank)} aria-label={`Compare schedule ${s.rank}`} />
              <svg viewBox="0 0 20 20" className="size-5 peer-focus-visible:outline-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {checked ? <path d="M4 10.5l4 4 8-9" /> : <path d="M3 6h14M3 10h14M3 14h9" />}
              </svg>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

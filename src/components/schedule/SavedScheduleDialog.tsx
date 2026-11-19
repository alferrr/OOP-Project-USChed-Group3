'use client'

import { useEffect, useRef, useState } from 'react'
import { Image, Link2, Trash2, X } from 'lucide-react'
import ScheduleInsights from './ScheduleInsights'
import ScoreBadge from './ScoreBadge'
import WeeklyCalendar from './WeeklyCalendar'
import { downloadPng } from '../../lib/exportImage'
import { shareUrl } from '../../lib/shareSchedule'
import { describeMeetings, format12, formatMinutes } from '../../lib/time'
import type { SavedSchedule } from '../../store/planStore'

interface Props {
  item: SavedSchedule
  onRemove: (item: SavedSchedule) => void
  onClose: () => void
}

export const termLabel = (semester: string, academicYear: string) =>
  `${{ '1ST': '1st sem', '2ND': '2nd sem', SUMMER: 'Summer' }[semester] ?? semester} ${academicYear}`

/** The full view of one saved schedule, opened from its card. */
export default function SavedScheduleDialog({ item, onRemove, onClose }: Props) {
  const { schedule } = item
  const dialog = useRef<HTMLDivElement>(null)
  const calendar = useRef<HTMLDivElement>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportError, setExportError] = useState(false)

  useEffect(() => {
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyLink = async () => {
    const url = shareUrl({ semester: item.semester, academicYear: item.academicYear, sections: schedule.sections })
    setLink(url)
    try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) }
  }
  const exportPng = async () => {
    const node = calendar.current?.querySelector<HTMLElement>('[role="region"]')
    if (!node) return
    setExportError(false)
    try { await downloadPng(node, `${item.name.replace(/[^\w-]+/g, '-')}.png`) } catch { setExportError(true) }
  }

  return (
    <div className="backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-green-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="saved-title" tabIndex={-1}
        className="pop my-4 w-full max-w-5xl rounded-[2rem] bg-white p-6 shadow-[var(--shadow-lift)] outline-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="saved-title" className="text-2xl font-extrabold text-green-900">{item.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-green-900/80">
              <span>{termLabel(item.semester, item.academicYear)}</span>
              <span className="flex items-center gap-1.5">Score <ScoreBadge score={schedule.score} /></span>
              <span>{schedule.stats.schoolDays} school days</span>
              <span>{schedule.stats.earliestStart && format12(schedule.stats.earliestStart)} – {schedule.stats.latestEnd && format12(schedule.stats.latestEnd)}</span>
              <span>{schedule.stats.totalUnits} units</span>
              <span>Gaps: {formatMinutes(schedule.stats.totalGapMinutes)}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-green-700 hover:bg-green-100">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={copyLink} className="btn btn-quiet px-4 py-2"><Link2 size={14} aria-hidden /> Copy link</button>
          <button type="button" onClick={exportPng} className="btn btn-quiet px-4 py-2"><Image size={14} aria-hidden /> PNG</button>
          <button type="button" onClick={() => onRemove(item)}
            className="btn px-4 py-2 text-red-700 hover:bg-red-50"><Trash2 size={14} aria-hidden /> Remove</button>
        </div>
        {link && (
          <div className="mt-3">
            <p role="status" className="mb-1 text-sm text-green-900/80">
              {copied ? 'Link copied. Anyone with it can see this schedule, nothing else.' : 'Copy this link to share the schedule:'}
            </p>
            <input readOnly value={link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} className="control" />
          </div>
        )}
        {exportError && <p role="alert" className="alert-error mt-3">Couldn't create the image.</p>}

        <div ref={calendar} className="mt-5"><WeeklyCalendar sections={schedule.sections} /></div>
        <div className="mt-5"><ScheduleInsights schedule={schedule} /></div>

        <h3 className="mb-3 mt-6 text-lg font-bold text-green-900">Sections</h3>
        <ul className="grid gap-4 text-sm sm:grid-cols-2">
          {schedule.sections.map((s) => (
            <li key={s.sectionId} className="surface p-4">
              <p className="text-base font-bold text-green-900">{s.courseCode} · Section {s.sectionCode}</p>
              <p className="text-green-900/80">{s.courseName} · {s.instructor ?? 'Instructor TBA'}</p>
              {describeMeetings(s.meetings).map((l) => <p key={l} className="text-green-900/70">{l}</p>)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

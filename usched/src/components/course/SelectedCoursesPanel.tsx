import { useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useSections } from '../../api/hooks'
import type { CourseSummary, Section } from '../../api/types'
import { describeMeetings } from '../../lib/time'
import { useSelectionStore, useTermStore } from '../../store/planStore'
import UnitsSummary from './UnitsSummary'

/** The distinct real courses fetched under one code (e.g. the 3 electives ISMIS offers under "GE-FEL"). */
function distinctCourseNames(sections: Section[] | undefined): string[] {
  if (!sections) return []
  return [...new Set(sections.map((s) => s.courseName))]
}

function SelectedCourseRow({ course, onRemove }: { course: CourseSummary; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const [chosenName, setChosenName] = useState('')
  const { semester, academicYear } = useTermStore()
  const sections = useSections(course.id, semester, academicYear, open)

  const names = distinctCourseNames(sections.data)
  const offerings = (sections.data ?? []).filter((s) => s.courseName === chosenName)

  return (
    <li className="rounded-2xl bg-white/10 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Sections of ${course.code}`}
          className="grid size-6 place-items-center rounded-full text-white/80 hover:bg-white/15">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="flex-1"><strong>{course.code}</strong> <span className="text-white/70">{course.units}u</span></span>
        <button aria-label={`Remove ${course.code}`} onClick={onRemove} className="grid size-6 place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-gold-300">
          <X size={14} />
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-white/15 pt-2">
          {sections.isLoading && <p className="text-white/70">Loading…</p>}
          {sections.data?.length === 0 && <p className="text-white/70">No sections offered this term.</p>}
          {names.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-white/80">Course</span>
              <select aria-label={`Course under ${course.code}`}
                className="w-full rounded-xl bg-white px-3 py-1.5 text-sm text-green-900"
                value={chosenName} onChange={(e) => setChosenName(e.target.value)}>
                <option value="">Choose…</option>
                {names.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          )}
          {chosenName && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-white/80">Schedule</span>
              <select aria-label={`Schedule for ${chosenName}`}
                className="w-full rounded-xl bg-white px-3 py-1.5 text-sm text-green-900">
                {offerings.map((s) => (
                  <option key={s.sectionId}>
                    {s.sectionCode} · {describeMeetings(s.meetings).join(', ') || 'No schedule yet'}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </li>
  )
}

export default function SelectedCoursesPanel() {
  const { selected, remove, clear } = useSelectionStore()
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Your plan</h2>
        {selected.length > 0 && (
          <button onClick={clear} className="rounded-full px-3 py-1 text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white">
            Clear all
          </button>
        )}
      </div>
      {selected.length === 0 ? (
        <p className="mb-3 text-sm text-white/75">Nothing selected yet.</p>
      ) : (
        <ul className="mb-4 max-h-72 space-y-1.5 overflow-y-auto">
          {selected.map((c) => (
            <SelectedCourseRow key={c.id} course={c} onRemove={() => remove(c.id)} />
          ))}
        </ul>
      )}
      <UnitsSummary units={selected.map((c) => c.units)} />
    </div>
  )
}

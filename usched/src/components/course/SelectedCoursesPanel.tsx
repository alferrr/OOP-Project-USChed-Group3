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
    <li className="rounded bg-green-50 px-3 py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Sections of ${course.code}`}
          className="text-green-700">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="flex-1"><strong>{course.code}</strong> <span className="text-green-900/70">{course.units}u</span></span>
        <button aria-label={`Remove ${course.code}`} onClick={onRemove} className="text-green-700 hover:text-red-600">
          <X size={14} />
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-green-100 pt-2">
          {sections.isLoading && <p className="text-green-900/60">Loading…</p>}
          {sections.data?.length === 0 && <p className="text-green-900/60">No sections offered this term.</p>}
          {names.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-green-900/70">Course</span>
              <select aria-label={`Course under ${course.code}`}
                className="w-full rounded border border-green-200 bg-white px-2 py-1 text-sm"
                value={chosenName} onChange={(e) => setChosenName(e.target.value)}>
                <option value="">Choose…</option>
                {names.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          )}
          {chosenName && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-green-900/70">Schedule</span>
              <select aria-label={`Schedule for ${chosenName}`}
                className="w-full rounded border border-green-200 bg-white px-2 py-1 text-sm">
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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-green-800">Selected courses</h2>
        {selected.length > 0 && (
          <button onClick={clear} className="text-xs font-medium text-green-700 hover:text-red-600">
            Clear all
          </button>
        )}
      </div>
      {selected.length === 0 ? (
        <p className="text-sm text-green-900/60">Nothing selected yet.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {selected.map((c) => (
            <SelectedCourseRow key={c.id} course={c} onRemove={() => remove(c.id)} />
          ))}
        </ul>
      )}
      <UnitsSummary units={selected.map((c) => c.units)} />
    </div>
  )
}

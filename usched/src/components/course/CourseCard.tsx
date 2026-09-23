import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, Plus } from 'lucide-react'
import { useSections } from '../../api/hooks'
import type { CourseSummary, SemesterCode } from '../../api/types'
import { describeMeetings } from '../../lib/time'

interface Props {
  course: CourseSummary
  selected: boolean
  semester: SemesterCode
  academicYear: string
  onToggle: () => void
}

export default function CourseCard({ course, selected, semester, academicYear, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  const sections = useSections(course.id, semester, academicYear, open)

  return (
    <li className={`rounded-lg border ${selected ? 'border-green-600 bg-green-50' : 'border-green-100 bg-white'}`}>
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Sections of ${course.code}`}
          className="text-green-700">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-green-900">
            {course.code} <span className="font-normal text-green-900/70">· {course.units} units</span>
          </p>
          <p className="truncate text-sm text-green-900/80">{course.name}</p>
          {course.department && <span className="mt-1 inline-block rounded bg-gold-100 px-2 py-0.5 text-xs text-green-900">{course.department}</span>}
        </div>
        <button onClick={onToggle} aria-pressed={selected}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
            selected ? 'bg-green-700 text-white' : 'border border-green-700 text-green-800 hover:bg-green-50'}`}>
          {selected ? <><Check size={14} aria-hidden /> Selected</> : <><Plus size={14} aria-hidden /> Add</>}
        </button>
      </div>
      {open && (
        <div className="border-t border-green-100 px-4 py-3 text-sm">
          {sections.isLoading && <p className="text-green-900/60">Loading sections…</p>}
          {sections.data?.length === 0 && <p className="text-green-900/60">No sections offered this term.</p>}
          <ul className="space-y-2">
            {sections.data?.map((s) => (
              <li key={s.sectionId} className="rounded bg-white/70 p-2">
                <p className="font-medium text-green-900">
                  Section {s.sectionCode}
                  <span className="font-normal text-green-900/70"> · {s.instructor ?? 'Instructor TBA'}
                    {s.availableSlots !== null && ` · ${s.availableSlots} slots`}</span>
                </p>
                {describeMeetings(s.meetings).map((line) => <p key={line} className="text-green-900/80">{line}</p>)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

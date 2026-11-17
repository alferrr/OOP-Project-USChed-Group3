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
    <li className={`surface overflow-hidden transition-colors duration-300 ${selected ? 'bg-green-50' : ''}`}>
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Sections of ${course.code}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-green-700 transition-colors hover:bg-green-100">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-green-900">
            {course.code} <span className="font-normal text-green-900/70">· {course.units} units</span>
          </p>
          <p className="truncate text-sm text-green-900/80">{course.name}</p>
          {course.department && <span className="chip mt-1.5 max-w-full truncate">{course.department}</span>}
        </div>
        <button onClick={onToggle} aria-pressed={selected}
          className={`grid size-11 shrink-0 place-items-center rounded-full transition-all duration-300 active:scale-95 ${
            selected ? 'bg-gold-400 text-green-900' : 'bg-green-700 text-white hover:bg-green-800'}`}>
          {selected ? <Check size={22} strokeWidth={3} aria-hidden /> : <Plus size={22} strokeWidth={2.5} aria-hidden />}
          <span className="sr-only">{selected ? 'Selected' : 'Add'}</span>
        </button>
      </div>
      {open && (
        <div className="bg-green-50/70 px-5 py-4 text-sm">
          {sections.isLoading && <p className="text-green-900/70">Loading sections…</p>}
          {sections.data?.length === 0 && <p className="text-green-900/70">No sections offered this term.</p>}
          <ul className="space-y-2">
            {sections.data?.map((s) => (
              <li key={s.sectionId} className="rounded-2xl bg-white p-3">
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

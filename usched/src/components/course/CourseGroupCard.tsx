import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCourses } from '../../api/hooks'
import type { CourseSummary, SemesterCode } from '../../api/types'
import CourseCard from './CourseCard'

interface Props {
  family: string
  selected: CourseSummary[]
  semester: SemesterCode
  academicYear: string
  onToggle: (course: CourseSummary) => void
}

/**
 * One row per family (e.g. "GE-FEL"), collapsing every one of its offerings behind a single dropdown -
 * fetched as its own complete list (not just whatever page of the main catalog triggered this row), so
 * a family with more offerings than fit on one page still shows every one of them, scrolling inside.
 */
export default function CourseGroupCard({ family, selected, semester, academicYear, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  const offerings = useCourses({ q: family, department: '', semester, academicYear, page: 0, size: 100 })
  const courses = offerings.data?.items ?? []
  const selectedCount = courses.filter((c) => selected.some((s) => s.id === c.id)).length

  return (
    <li className="rounded-lg border border-green-100 bg-white">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Courses under ${family}`}
        className="flex w-full items-center gap-3 p-3 text-left">
        {open ? <ChevronDown size={18} className="text-green-700" aria-hidden /> : <ChevronRight size={18} className="text-green-700" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-green-900">{family}</p>
          <p className="text-sm text-green-900/80">
            {offerings.data ? `${offerings.data.total} courses offered` : 'Loading…'}
          </p>
        </div>
        {selectedCount > 0 && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {selectedCount} selected
          </span>
        )}
      </button>
      {open && (
        <div className="max-h-80 overflow-y-auto border-t border-green-100 p-3">
          <ul className="space-y-2">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} semester={semester} academicYear={academicYear}
                selected={selected.some((s) => s.id === c.id)} onToggle={() => onToggle(c)} />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

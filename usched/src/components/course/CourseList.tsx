import type { CoursePage, SemesterCode } from '../../api/types'
import { groupCourses } from '../../lib/courseGroups'
import { useSelectionStore } from '../../store/planStore'
import CourseCard from './CourseCard'
import CourseGroupCard from './CourseGroupCard'

interface Props {
  data: CoursePage | undefined
  loading: boolean
  semester: SemesterCode
  academicYear: string
  onPage: (p: number) => void
}

export default function CourseList({ data, loading, semester, academicYear, onPage }: Props) {
  const { selected, toggle } = useSelectionStore()
  if (loading && !data) return <p className="text-green-900/70" role="status">Loading courses…</p>
  if (!data || data.items.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] bg-green-100/60 p-8 text-center text-base text-green-900/70">
        No saved courses match. Fetch the courses you need from ISMIS using the box above.
      </p>
    )
  }
  const pages = Math.max(1, Math.ceil(data.total / data.size))
  const rows = groupCourses(data.items)
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) =>
          row.kind === 'group' ? (
            <CourseGroupCard key={row.group.family} family={row.group.family} selected={selected}
              semester={semester} academicYear={academicYear} onToggle={toggle} />
          ) : (
            <CourseCard key={row.course.id} course={row.course} semester={semester} academicYear={academicYear}
              selected={selected.some((s) => s.id === row.course.id)} onToggle={() => toggle(row.course)} />
          ),
        )}
      </ul>
      <div className="mt-5 flex items-center justify-between text-sm text-green-900/70">
        <span>{data.total} courses</span>
        <div className="flex items-center gap-2">
          <button disabled={data.page === 0} onClick={() => onPage(data.page - 1)}
            className="btn btn-quiet px-4 py-1.5">Previous</button>
          <span>Page {data.page + 1} of {pages}</span>
          <button disabled={data.page + 1 >= pages} onClick={() => onPage(data.page + 1)}
            className="btn btn-quiet px-4 py-1.5">Next</button>
        </div>
      </div>
    </div>
  )
}

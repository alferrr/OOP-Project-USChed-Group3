import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAcademicYears, useClearCatalog, useCourses, useDepartments, useGenerate, useSemesters, useSearchStatus, useStartSearch } from '../api/hooks'
import type { SemesterCode } from '../api/types'
import CourseCodesInput from '../components/course/CourseCodesInput'
import ProspectusPicker from '../components/course/ProspectusPicker'
import CourseList from '../components/course/CourseList'
import CourseSearchBar from '../components/course/CourseSearchBar'
import SelectedCoursesPanel from '../components/course/SelectedCoursesPanel'
import SearchProgress from '../components/ismis/SearchProgress'
import PageTitle from '../components/layout/PageTitle'
import PreferencesForm from '../components/preferences/PreferencesForm'
import { errorHelp } from '../lib/errors'
import { pickCoursesToSelect } from '../lib/search'
import { useIsmisStore } from '../store/ismisStore'
import { usePreferencesStore, useScheduleStore, useSelectionStore, useTermStore } from '../store/planStore'

export default function CourseSelectionPage() {
  const navigate = useNavigate()
  const { semester, academicYear, setTerm } = useTermStore()
  const endSession = useIsmisStore((s) => s.end)

  const [codes, setCodes] = useState<string[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const handledJob = useRef<string | null>(null)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(0) }, 250)
    return () => clearTimeout(t)
  }, [q])

  const semesters = useSemesters()
  const years = useAcademicYears()
  const departments = useDepartments()
  // A generous page size: a private catalog is a handful of searches' worth of courses, and one large page
  // means a family (e.g. GE-FEL's dozens of offerings) collapses into its one dropdown row instead of
  // scattering across several "pages" that are each, confusingly, still just more of that same family.
  const courses = useCourses({ q: debouncedQ, department, semester, academicYear, page, size: 100 })
  const startSearch = useStartSearch()
  const search = useSearchStatus(jobId)
  const { selected, addMany, clear: clearSelection } = useSelectionStore()
  const { preferences, setPreferences } = usePreferencesStore()
  const generate = useGenerate()
  const setResult = useScheduleStore((s) => s.setResult)
  const clearCatalog = useClearCatalog()

  const running = startSearch.isPending || (!!search.data && search.data.status !== 'DONE' && search.data.status !== 'FAILED')

  // When a search finishes: add the courses that were asked for to the selection.
  useEffect(() => {
    const data = search.data
    if (!data || handledJob.current === data.jobId) return
    if (data.status === 'DONE') {
      handledJob.current = data.jobId
      addMany(pickCoursesToSelect(data.items))
    } else if (data.status === 'FAILED') {
      handledJob.current = data.jobId
      if (data.error?.code === 'ISMIS_SESSION_EXPIRED') endSession('Your ISMIS session ended. Please sign in again.')
    }
  }, [search.data, addMany, endSession])

  const fetchCourses = () => {
    startSearch.mutate({ semester, academicYear, queries: codes }, {
      onSuccess: (r) => { setJobId(r.jobId); setCodes([]) },
    })
  }

  const clearSavedCourses = () => clearCatalog.mutate(undefined, { onSuccess: clearSelection })

  const submitGenerate = () =>
    generate.mutate(
      { courseIds: selected.map((c) => c.id), semester, academicYear, preferences },
      { onSuccess: (r) => { setResult(r); navigate('/schedules') } },
    )

  const startError = startSearch.error instanceof ApiError ? startSearch.error : null
  const genError = generate.error instanceof ApiError ? generate.error : null
  const yearOptions = [...new Set([academicYear, ...(years.data ?? [])])]
  const select = 'rounded-md border border-green-100 bg-white px-3 py-2 text-sm'

  return (
    <section>
      <PageTitle title="Choose your courses">
        Enter course codes, or a whole department code like "CIS", and USChed fetches them from ISMIS one by one, then builds conflict-free schedules.
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <select aria-label="Semester" className={select} value={semester}
              onChange={(e) => { setTerm(e.target.value as SemesterCode, academicYear); setPage(0) }}>
              {(semesters.data ?? [{ code: '1ST', label: '1st Semester' }]).map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <select aria-label="Academic year" className={select} value={academicYear}
              onChange={(e) => { setTerm(semester, e.target.value); setPage(0) }}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-green-900/60">Searches use this term.</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-green-100 bg-white p-4">
              <ProspectusPicker semester={semester} codes={codes} onAddCodes={setCodes} disabled={running} />
              <CourseCodesInput codes={codes} onChange={setCodes} disabled={running} />
              <button onClick={fetchCourses} disabled={codes.length === 0 || running}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-700/30">
                {running ? 'Fetching…' : `Fetch ${codes.length || ''} ${codes.length === 1 ? 'course' : 'courses'} from ISMIS`}
              </button>
              {startError && (
                <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                  {errorHelp(startError.code, startError.message)}
                </p>
              )}
            </div>
            {search.data && (
              <SearchProgress status={search.data} selectedCount={selected.length}
                addedCourseIds={selected.map((c) => c.id)}
                onAddSuggestion={(c) => addMany([{ ...c, department: null, prerequisites: null }])} />
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-green-800">Saved courses</h2>
              {!!courses.data?.total && (
                <button onClick={clearSavedCourses} disabled={clearCatalog.isPending}
                  className="text-xs font-medium text-green-700 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {clearCatalog.isPending ? 'Clearing…' : 'Clear saved courses'}
                </button>
              )}
            </div>
            <div className="space-y-4">
              <CourseSearchBar q={q} department={department} departments={departments.data ?? []}
                onQ={setQ} onDepartment={(d) => { setDepartment(d); setPage(0) }} />
              <CourseList data={courses.data} loading={courses.isLoading} semester={semester} academicYear={academicYear} onPage={setPage} />
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border-2 border-green-700 bg-white p-4">
            <SelectedCoursesPanel />
          </div>
          <PreferencesForm value={preferences} onChange={setPreferences} />
          <button onClick={submitGenerate} disabled={selected.length === 0 || generate.isPending}
            className="w-full rounded-md bg-gold-400 px-4 py-3 font-bold text-green-900 shadow hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50">
            {generate.isPending ? 'Generating…' : 'Generate Schedules'}
          </button>
          {genError && (
            <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-medium">{genError.message}</p>
              {genError.details.length > 0 && (
                <ul className="mt-1 list-disc pl-5">{genError.details.map((d) => <li key={d}>{d}</li>)}</ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

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
  const [suggestQ, setSuggestQ] = useState('')
  const suggestions = useCourses({ q: suggestQ, department: '', semester, academicYear, page: 0, size: 8 }, suggestQ !== '')
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
  const select = 'control w-auto!'

  return (
    <section className="pb-24 lg:pb-0">
      <PageTitle title="Choose your courses">
        Enter course codes, or a whole department code like "CIS", and USChed fetches them from ISMIS one by one, then builds conflict-free schedules.
      </PageTitle>

      {/* minmax(0, ...) on the main column, not a bare "1fr": otherwise a long, unbroken bit of text deep
          inside (e.g. a course name) can force this whole column - and everything in it - wider than the
          page, since a plain "1fr" track still defaults to auto-sizing around its content's natural width. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <select aria-label="Semester" className={select} value={semester}
              onChange={(e) => { setTerm(e.target.value as SemesterCode, academicYear); setPage(0) }}>
              {(semesters.data ?? [{ code: '1ST', label: '1st Semester' }]).map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            <select aria-label="Academic year" className={select} value={academicYear}
              onChange={(e) => { setTerm(semester, e.target.value); setPage(0) }}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-sm text-green-900/70">Searches use this term.</span>
          </div>

          <div className="space-y-4">
            <div className="surface space-y-5 p-5 sm:p-6">
              <ProspectusPicker semester={semester} codes={codes} onAddCodes={setCodes} disabled={running} />
              <CourseCodesInput codes={codes} onChange={setCodes} disabled={running} onQuery={setSuggestQ}
                suggestions={suggestQ && !suggestions.isPlaceholderData ? suggestions.data?.items : undefined} />
              <button onClick={fetchCourses} disabled={codes.length === 0 || running}
                className="btn btn-primary">
                {running ? 'Fetching…' : `Fetch ${codes.length || ''} ${codes.length === 1 ? 'course' : 'courses'} from ISMIS`}
              </button>
              {startError && (
                <p role="alert" className="alert-error">
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-green-900">Saved courses</h2>
              {!!courses.data?.total && (
                <button onClick={clearSavedCourses} disabled={clearCatalog.isPending}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-green-700 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50">
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

        {/* Sticky column. Only the Preferences card scrolls (inside PreferencesForm); it overlaps the plan card's bottom edge. */}
        <aside className="flex flex-col lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] bg-green-800 p-5 pb-10 text-white shadow-[var(--shadow-lift)]">
            <SelectedCoursesPanel />
            <button onClick={submitGenerate} disabled={selected.length === 0 || generate.isPending}
              className="btn btn-gold mt-5 w-full py-3.5 text-base">
              {generate.isPending ? 'Generating…' : 'Generate Schedules'}
            </button>
          </div>
          <div className="relative z-10 -mt-6 px-2">
            <PreferencesForm value={preferences} onChange={setPreferences} />
          </div>
          {genError && (
            <div role="alert" className="alert-error mt-4">
              <p className="font-medium">{genError.message}</p>
              {genError.details.length > 0 && (
                <ul className="mt-1 list-disc pl-5">{genError.details.map((d) => <li key={d}>{d}</li>)}</ul>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* On a phone the plan card sits far below the list, so keep the way forward in reach. */}
      {selected.length > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-full bg-green-800 py-2 pl-5 pr-2 text-white shadow-[var(--shadow-lift)] lg:hidden">
          <span className="text-sm font-semibold">
            {selected.length} {selected.length === 1 ? 'course' : 'courses'} · {selected.reduce((n, c) => n + c.units, 0)} units
          </span>
          <button onClick={submitGenerate} disabled={generate.isPending} aria-label="Generate schedules from your plan"
            className="btn btn-gold px-5 py-2.5">
            {generate.isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}
    </section>
  )
}

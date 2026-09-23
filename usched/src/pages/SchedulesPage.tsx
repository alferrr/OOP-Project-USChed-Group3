import { Link } from 'react-router-dom'
import { Printer, Sparkles, Undo2 } from 'lucide-react'
import { useCompare, useGenerate } from '../api/hooks'
import { ApiError } from '../api/client'
import ComparisonTable from '../components/compare/ComparisonTable'
import PageTitle from '../components/layout/PageTitle'
import ScheduleSwitcher from '../components/schedule/ScheduleSwitcher'
import ScoreBadge from '../components/schedule/ScoreBadge'
import WeeklyCalendar from '../components/schedule/WeeklyCalendar'
import { describeMeetings, format12, formatMinutes } from '../lib/time'
import { usePreferencesStore, useScheduleStore, useSelectionStore, useTermStore } from '../store/planStore'

export default function SchedulesPage() {
  const { result, baseResult, showingSimilarTo, activeIndex, compareRanks, setActive, toggleCompare,
    setSimilarResult, backToAll } = useScheduleStore()
  const preferences = usePreferencesStore((s) => s.preferences)
  const selected = useSelectionStore((s) => s.selected)
  const selectedCourseIds = selected.map((c) => c.id)
  const { semester, academicYear } = useTermStore()
  const compare = useCompare()
  const moreLikeThis = useGenerate()

  if (!result) {
    return (
      <section>
        <PageTitle title="Schedules" />
        <p className="text-green-900/70">
          No schedules yet. <Link to="/courses" className="font-medium text-green-700 underline">Choose your courses</Link> and generate some.
        </p>
      </section>
    )
  }

  const active = result.schedules[activeIndex] ?? result.schedules[0]
  const runCompare = () => {
    const chosen = result.schedules.filter((s) => compareRanks.includes(s.rank))
    compare.mutate({ schedules: chosen.map((s) => s.sections.map((x) => x.sectionId)), preferences })
  }
  const comparedRanks = result.schedules.filter((s) => compareRanks.includes(s.rank)).map((s) => s.rank)

  const runMoreLikeThis = () => {
    moreLikeThis.mutate(
      {
        courseIds: selectedCourseIds,
        semester,
        academicYear,
        preferences,
        likeSectionIds: active.sections.map((s) => s.sectionId),
      },
      { onSuccess: (r) => setSimilarResult(r, active.rank) },
    )
  }
  const moreLikeThisError = moreLikeThis.error instanceof ApiError ? moreLikeThis.error : null

  return (
    <section>
      <PageTitle title="Your schedules">
        {result.generatedCount} conflict-free {result.generatedCount === 1 ? 'schedule' : 'schedules'} found; showing the top {result.returnedCount}.
        Enroll manually in the official ISMIS.
      </PageTitle>

      <div className="space-y-6">
        {showingSimilarTo !== null && baseResult && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold-300 bg-gold-50 px-4 py-2 text-sm text-green-900">
            <Sparkles size={16} className="text-gold-600" aria-hidden />
            <span>Showing schedules similar to #{showingSimilarTo} from your original results.</span>
            <button onClick={backToAll} className="ml-auto flex items-center gap-1 font-medium text-green-700 underline">
              <Undo2 size={14} aria-hidden /> Back to all results
            </button>
          </div>
        )}

        <ScheduleSwitcher schedules={result.schedules} activeIndex={activeIndex} compareRanks={compareRanks}
          onSelect={setActive} onToggleCompare={toggleCompare} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900">
          <span className="flex items-center gap-2 font-semibold">Schedule #{active.rank} <ScoreBadge score={active.score} /></span>
          <span>{active.stats.schoolDays} school days</span>
          <span>{active.stats.earliestStart && format12(active.stats.earliestStart)} – {active.stats.latestEnd && format12(active.stats.latestEnd)}</span>
          <span>{active.stats.totalUnits} units</span>
          <span>Gaps: {formatMinutes(active.stats.totalGapMinutes)}</span>
          <div className="ml-auto flex items-center gap-4 print:hidden">
            <button onClick={runMoreLikeThis} disabled={moreLikeThis.isPending}
              className="flex items-center gap-1 text-green-700 underline disabled:opacity-50">
              <Sparkles size={14} aria-hidden /> {moreLikeThis.isPending ? 'Finding similar…' : 'More like this'}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 text-green-700 underline">
              <Printer size={14} aria-hidden /> Print
            </button>
          </div>
        </div>
        {moreLikeThisError && (
          <p role="alert" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-900 print:hidden">
            {moreLikeThisError.message}
          </p>
        )}

        <WeeklyCalendar sections={active.sections} />

        <div>
          <h2 className="mb-2 font-semibold text-green-800">Sections</h2>
          <ul className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            {active.sections.map((s) => (
              <li key={s.sectionId} className="rounded-lg border border-green-100 p-3">
                <p className="font-semibold text-green-900">{s.courseCode} · Section {s.sectionCode}</p>
                <p className="text-green-900/80">{s.courseName} · {s.instructor ?? 'Instructor TBA'}</p>
                {describeMeetings(s.meetings).map((l) => <p key={l} className="text-green-900/70">{l}</p>)}
              </li>
            ))}
          </ul>
        </div>

        <div className="max-w-md">
          <h2 className="mb-2 font-semibold text-green-800">Score breakdown</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(active.breakdown).map(([name, v]) => (
              <li key={name}>
                <div className="flex justify-between text-green-900"><span>{name}</span><span>{Math.round(v * 100)}%</span></div>
                <div className="h-2 rounded bg-green-100"><div className="h-2 rounded bg-gold-400" style={{ width: `${v * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>

        <div className="print:hidden">
          <button onClick={runCompare} disabled={compareRanks.length < 2 || compare.isPending}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-700/30">
            Compare selected ({compareRanks.length})
          </button>
          <span className="ml-3 text-xs text-green-900/60">Tick 2 to 4 schedules above.</span>
          {compare.isError && <p role="alert" className="mt-2 text-sm text-red-800">{compare.error.message}</p>}
          {compare.data && <div className="mt-4"><ComparisonTable ranks={comparedRanks} items={compare.data.items} /></div>}
        </div>
      </div>
    </section>
  )
}

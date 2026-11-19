'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Bookmark, BookmarkCheck, Image, Link2, Printer, Sparkles, Undo2, X } from 'lucide-react'
import { useCompare, useGenerate, useSavedActions, useSyncSavedSchedules } from '../api/hooks'
import { ApiError } from '../api/client'
import ComparisonTable from '../components/compare/ComparisonTable'
import PageTitle from '../components/layout/PageTitle'
import ScheduleInsights from '../components/schedule/ScheduleInsights'
import ScheduleSwitcher from '../components/schedule/ScheduleSwitcher'
import ScoreBadge from '../components/schedule/ScoreBadge'
import WeeklyCalendar from '../components/schedule/WeeklyCalendar'
import { downloadPng } from '../lib/exportImage'
import { shareUrl } from '../lib/shareSchedule'
import { describeMeetings, format12, formatMinutes } from '../lib/time'
import { savedId, usePreferencesStore, useSavedStore, useScheduleStore, useSelectionStore, useTermStore } from '../store/planStore'
import type { SavedSchedule } from '../store/planStore'

export default function SchedulesPage() {
  const { result, baseResult, showingSimilarTo, activeIndex, compareRanks, setActive, toggleCompare,
    setSimilarResult, backToAll } = useScheduleStore()
  const preferences = usePreferencesStore((s) => s.preferences)
  const selected = useSelectionStore((s) => s.selected)
  const selectedCourseIds = selected.map((c) => c.id)
  const { semester, academicYear } = useTermStore()
  const compare = useCompare()
  const moreLikeThis = useGenerate()
  const saved = useSavedStore((s) => s.saved)
  const { save, remove: removeSaved, error: saveError } = useSavedActions()
  useSyncSavedSchedules()
  // A saved schedule being looked at in place of the ranked results; picking a ranked schedule goes back.
  const [viewingSaved, setViewingSaved] = useState<SavedSchedule | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportError, setExportError] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  // With no freshly generated results, saved schedules are still viewable (they come back after signing in again).
  const shownSaved = viewingSaved && saved.some((x) => x.id === viewingSaved.id) ? viewingSaved : !result ? (saved[0] ?? null) : null
  if (!result && !shownSaved) {
    return (
      <section>
        <PageTitle title="Schedules" />
        <div className="surface p-8 text-center">
          <p className="text-lg text-green-900/80">No schedules yet.</p>
          <Link href="/courses" className="btn btn-primary mt-4">Choose your courses</Link>
        </div>
      </section>
    )
  }

  const active = shownSaved?.schedule ?? result!.schedules[activeIndex] ?? result!.schedules[0]
  const activeTerm = shownSaved ?? { semester, academicYear }
  const isSaved = saved.some((x) => x.id === savedId(active))
  const toggleSaved = () => {
    const mine = saved.find((x) => x.id === savedId(active))
    if (mine) removeSaved(mine)
    else save(active, activeTerm.semester, activeTerm.academicYear)
  }
  const copyLink = async () => {
    const url = shareUrl({ semester: activeTerm.semester, academicYear: activeTerm.academicYear, sections: active.sections })
    setLink(url)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false) // the link is still shown below to copy by hand
    }
  }
  const exportPng = async () => {
    const node = calendarRef.current?.querySelector<HTMLElement>('[role="region"]')
    if (!node) return
    setExportError(false)
    try {
      await downloadPng(node, `usched-schedule-${active.rank}.png`)
    } catch {
      setExportError(true)
    }
  }
  const runCompare = () => {
    const chosen = (result?.schedules ?? []).filter((s) => compareRanks.includes(s.rank))
    compare.mutate({ schedules: chosen.map((s) => s.sections.map((x) => x.sectionId)), preferences })
  }
  const comparedRanks = (result?.schedules ?? []).filter((s) => compareRanks.includes(s.rank)).map((s) => s.rank)

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
      <div className="print:hidden">
        {result ? (
          <PageTitle title="Your schedules">
            {result.generatedCount} conflict-free {result.generatedCount === 1 ? 'schedule' : 'schedules'} found; showing the top {result.returnedCount}.
            Enroll manually in the official ISMIS.
          </PageTitle>
        ) : (
          <PageTitle title="Your saved schedules">
            These are the schedules you saved. Generate new ones from Courses any time. Enroll manually in the official ISMIS.
          </PageTitle>
        )}
      </div>

      <div className="space-y-6">
        {showingSimilarTo !== null && baseResult && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-green-100 px-5 py-3 text-sm text-green-900 print:hidden">
            <Sparkles size={16} className="text-green-700" aria-hidden />
            <span>Showing schedules similar to #{showingSimilarTo} from your original results.</span>
            <button onClick={backToAll} className="ml-auto flex items-center gap-1 rounded-full px-3 py-1 font-semibold text-green-800 hover:bg-green-200">
              <Undo2 size={14} aria-hidden /> Back to all results
            </button>
          </div>
        )}

        {saveError && <p role="alert" className="alert-error print:hidden">Couldn't update your saved schedules: {saveError}</p>}

        {result && (
        <div className="print:hidden">
          <ScheduleSwitcher schedules={result.schedules} activeIndex={activeIndex} compareRanks={compareRanks}
            onSelect={(i) => { setViewingSaved(null); setActive(i) }} onToggleCompare={toggleCompare} />
        </div>
        )}

        {saved.length > 0 && (
          <div className="print:hidden">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-green-900/70">Saved schedules</h2>
            <ul className="flex flex-wrap gap-2" aria-label="Saved schedules">
              {saved.map((x) => (
                <li key={x.id} className="flex items-center">
                  <button onClick={() => setViewingSaved(x)} aria-current={shownSaved?.id === x.id}
                    className={`rounded-l-full py-2 pl-4 pr-3 text-sm font-semibold transition-colors ${
                      shownSaved?.id === x.id ? 'bg-green-700 text-white' : 'surface text-green-900 hover:bg-green-50'}`}>
                    {x.schedule.sections.map((s) => s.courseCode).join(', ')}
                  </button>
                  <button aria-label={`Remove saved schedule ${x.schedule.sections.map((s) => s.courseCode).join(', ')}`}
                    onClick={() => { removeSaved(x); if (viewingSaved?.id === x.id) setViewingSaved(null) }}
                    className="grid size-9 place-items-center rounded-r-full bg-green-100 text-green-800 hover:bg-green-200">
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="surface flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 text-sm text-green-900">
          <span className="flex items-center gap-2 text-lg font-extrabold">Schedule #{active.rank} <ScoreBadge score={active.score} /></span>
          <span>{active.stats.schoolDays} school days</span>
          <span>{active.stats.earliestStart && format12(active.stats.earliestStart)} – {active.stats.latestEnd && format12(active.stats.latestEnd)}</span>
          <span>{active.stats.totalUnits} units</span>
          <span>Gaps: {formatMinutes(active.stats.totalGapMinutes)}</span>
          <div className="ml-auto flex items-center gap-4 print:hidden">
            {result && (
              <button onClick={runMoreLikeThis} disabled={moreLikeThis.isPending}
                className="btn btn-quiet px-4 py-2">
                <Sparkles size={14} aria-hidden /> {moreLikeThis.isPending ? 'Finding similar…' : 'More like this'}
              </button>
            )}
            <button onClick={toggleSaved} aria-pressed={isSaved} className="btn btn-quiet px-4 py-2">
              {isSaved ? <BookmarkCheck size={14} aria-hidden /> : <Bookmark size={14} aria-hidden />} {isSaved ? 'Saved' : 'Save'}
            </button>
            <button onClick={copyLink} className="btn btn-quiet px-4 py-2">
              <Link2 size={14} aria-hidden /> Copy link
            </button>
            <button onClick={exportPng} className="btn btn-quiet px-4 py-2">
              <Image size={14} aria-hidden /> PNG
            </button>
            <button onClick={() => window.print()} className="btn btn-quiet px-4 py-2">
              <Printer size={14} aria-hidden /> Print
            </button>
          </div>
        </div>
        {link && (
          <div className="print:hidden">
            <p role="status" className="mb-1 text-sm text-green-900/80">
              {copied ? 'Link copied. Anyone with it can see this schedule, nothing else.' : 'Copy this link to share the schedule:'}
            </p>
            <input readOnly value={link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} className="control" />
          </div>
        )}
        {exportError && <p role="alert" className="alert-error print:hidden">Couldn't create the image. Try Print instead.</p>}
        {moreLikeThisError && (
          <p role="alert" className="alert-error print:hidden">
            {moreLikeThisError.message}
          </p>
        )}

        <div ref={calendarRef}><WeeklyCalendar sections={active.sections} /></div>

        <div className="print:hidden">
          <ScheduleInsights schedule={active} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-bold text-green-900">Sections</h2>
          <ul className="grid gap-4 text-sm sm:grid-cols-2">
            {active.sections.map((s) => (
              <li key={s.sectionId} className="surface p-4">
                <p className="text-base font-bold text-green-900">{s.courseCode} · Section {s.sectionCode}</p>
                <p className="text-green-900/80">{s.courseName} · {s.instructor ?? 'Instructor TBA'}</p>
                {describeMeetings(s.meetings).map((l) => <p key={l} className="text-green-900/70">{l}</p>)}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface self-start p-5 print:hidden">
          <h2 className="mb-3 text-xl font-bold text-green-900">Score breakdown</h2>
          <ul className="space-y-3 text-sm">
            {Object.entries(active.breakdown).map(([name, v]) => (
              <li key={name}>
                <div className="flex justify-between text-green-900"><span>{name}</span><span>{Math.round(v * 100)}%</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-green-100"><div className="h-full rounded-full bg-green-600 transition-[width] duration-500" style={{ width: `${v * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        </div>

        {result && (
        <div className="print:hidden">
          <button onClick={runCompare} disabled={compareRanks.length < 2 || compare.isPending}
            className="btn btn-primary">
            Compare selected ({compareRanks.length})
          </button>
          <span className="ml-3 text-sm text-green-900/70">Press the round button beside 2 to 4 schedules above.</span>
          {compare.isError && <p role="alert" className="alert-error mt-3">{compare.error.message}</p>}
          {compare.data && <div className="mt-4"><ComparisonTable ranks={comparedRanks} items={compare.data.items} /></div>}
        </div>
        )}
      </div>
    </section>
  )
}

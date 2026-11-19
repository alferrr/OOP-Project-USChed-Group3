'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, RotateCcw } from 'lucide-react'
import { useSavedActions, useScoreSchedule, useSectionsOf, useSyncSavedSchedules } from '../api/hooks'
import type { Section } from '../api/types'
import PageTitle from '../components/layout/PageTitle'
import NameScheduleDialog from '../components/schedule/NameScheduleDialog'
import WeeklyCalendar from '../components/schedule/WeeklyCalendar'
import { clashesWith, findOverlaps, findTravelRisks } from '../lib/conflicts'
import { describeMeetings, format12, formatMinutes, toMinutes } from '../lib/time'
import { useBuildStore, usePreferencesStore, useSelectionStore, useTermStore } from '../store/planStore'

function SectionOption({ section, selected, clash, onPick }: { section: Section; selected: boolean; clash: string | null; onPick: () => void }) {
  const full = section.availableSlots === 0
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl px-3.5 py-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold-400 ${
      selected ? 'bg-gold-50 ring-2 ring-gold-400' : 'bg-green-50 hover:bg-green-100'}`}>
      <input type="radio" className="mt-1 size-4 shrink-0 accent-green-700" checked={selected} onChange={onPick}
        name={`course-${section.courseCode}`} aria-label={`${section.courseCode} section ${section.sectionCode}`} />
      <span className="min-w-0 flex-1 text-sm">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="text-green-900">Section {section.sectionCode}</strong>
          <span className="text-green-900/70">{section.instructor ?? 'Instructor TBA'}</span>
          {section.availableSlots !== null && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${full ? 'bg-red-50 text-red-700' : 'bg-white text-green-900/70'}`}>
              {full ? 'Full' : `${section.availableSlots} slots`}
            </span>
          )}
          {clash && !selected && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Clashes with {clash}</span>
          )}
        </span>
        {describeMeetings(section.meetings).map((l) => <span key={l} className="block text-green-900/70">{l}</span>)}
        {section.meetings.length === 0 && <span className="block text-green-900/60">No schedule posted yet</span>}
      </span>
    </label>
  )
}

/** Build a schedule by hand: choose one section for each selected course and watch the week fill in. */
export default function BuildSchedulePage() {
  const selected = useSelectionStore((s) => s.selected)
  const { semester, academicYear } = useTermStore()
  const { picks, pick, unpick, clear } = useBuildStore()
  const preferences = usePreferencesStore((s) => s.preferences)
  const { byCourse, loading, failed } = useSectionsOf(selected.map((c) => c.id), semester, academicYear)
  const score = useScoreSchedule()
  const { save, error: saveError } = useSavedActions()
  useSyncSavedSchedules()
  const [naming, setNaming] = useState(false)
  const [savedAs, setSavedAs] = useState<string | null>(null)

  if (selected.length === 0) {
    return (
      <section>
        <PageTitle title="Build your own schedule" />
        <div className="surface p-8 text-center">
          <p className="text-lg text-green-900/80">Choose your courses first, then pick a section for each one here.</p>
          <Link href="/courses" className="btn btn-primary mt-4">Choose your courses</Link>
        </div>
      </section>
    )
  }

  const chosen: Section[] = selected.flatMap((c) => {
    const s = byCourse.get(c.id)?.find((x) => x.sectionId === picks[c.id])
    return s ? [s] : []
  })
  const overlaps = findOverlaps(chosen)
  const risks = findTravelRisks(chosen)
  const meetings = chosen.flatMap((s) => s.meetings)
  const units = chosen.reduce((n, s) => n + s.units, 0)
  const days = new Set(meetings.map((m) => m.day)).size
  const earliest = meetings.length ? meetings.reduce((m, x) => (toMinutes(x.start) < toMinutes(m.start) ? x : m)).start : null
  const latest = meetings.length ? meetings.reduce((m, x) => (toMinutes(x.end) > toMinutes(m.end) ? x : m)).end : null
  const canSave = chosen.length > 0 && overlaps.length === 0

  const saveNamed = (name: string) => {
    score.mutate({ sectionIds: chosen.map((s) => s.sectionId), preferences }, {
      onSuccess: (ranked) => {
        save(ranked, semester, academicYear, name)
        setNaming(false)
        setSavedAs(name)
      },
      onError: () => setNaming(false),
    })
  }

  return (
    <section>
      <PageTitle title="Build your own schedule">
        Pick one section for each course. The week fills in as you go, and anything that clashes is flagged. Enroll manually in the official ISMIS.
      </PageTitle>

      <div className="space-y-6">
        <div className="surface flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 text-sm text-green-900">
          <span className="text-lg font-extrabold">{chosen.length} of {selected.length} courses placed</span>
          <span>{units} units</span>
          <span>{days} school {days === 1 ? 'day' : 'days'}</span>
          {earliest && latest && <span>{format12(earliest)} – {format12(latest)}</span>}
          {chosen.length > 1 && <span>Gaps: {formatMinutes(gapMinutes(chosen))}</span>}
          <div className="ml-auto flex items-center gap-3">
            {chosen.length > 0 && (
              <button onClick={clear} className="btn btn-quiet px-4 py-2"><RotateCcw size={14} aria-hidden /> Start over</button>
            )}
            <button onClick={() => { setSavedAs(null); setNaming(true) }} disabled={!canSave || score.isPending} className="btn btn-primary px-4 py-2">
              {score.isPending ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </div>

        {savedAs && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-green-100 px-5 py-3 text-sm text-green-900">
            <Check size={16} className="text-green-700" aria-hidden />
            Saved as “{savedAs}”. <Link href="/saved" className="font-semibold text-green-700 underline-offset-2 hover:underline">View saved schedules</Link>
          </p>
        )}
        {(saveError || score.isError) && (
          <p role="alert" className="alert-error">Couldn't save this schedule: {saveError ?? (score.error instanceof Error ? score.error.message : 'try again')}</p>
        )}
        {overlaps.length > 0 && (
          <div role="alert" className="alert-error">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} aria-hidden /> These classes clash, so this schedule can't be saved:</p>
            <ul className="mt-1 list-disc pl-5">{overlaps.map((o, i) => <li key={i}>{o.text}</li>)}</ul>
          </div>
        )}
        {risks.length > 0 && (
          <div role="status" className="rounded-2xl bg-gold-50 px-5 py-3 text-sm text-green-900">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-gold-700" aria-hidden /> Tight trip between campuses:</p>
            <ul className="mt-1 list-disc pl-5">{risks.map((r, i) => <li key={i}>{r.text}</li>)}</ul>
          </div>
        )}

        <WeeklyCalendar sections={chosen} />

        {failed && <p role="alert" className="alert-error">Couldn't load some sections. Try again in a moment.</p>}
        {loading && <p className="text-sm text-green-900/70" role="status">Loading sections…</p>}

        <div className="grid gap-5 lg:grid-cols-2">
          {selected.map((c) => {
            const sections = byCourse.get(c.id) ?? []
            const others = chosen.filter((s) => s.courseCode !== c.code)
            const names = [...new Set(sections.map((s) => s.courseName))]
            return (
              <fieldset key={c.id} className="surface p-5">
                <legend className="sr-only">{c.code}</legend>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-green-900">{c.code}</h2>
                    <p className="text-sm text-green-900/70">{c.name} · {c.units} units</p>
                  </div>
                  {picks[c.id] !== undefined && (
                    <button type="button" onClick={() => unpick(c.id)} className="rounded-full px-3 py-1 text-sm font-semibold text-green-700 hover:bg-green-100">Clear</button>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  {sections.length === 0 && !loading && <p className="text-sm text-green-900/70">No sections offered this term.</p>}
                  {names.map((n) => (
                    <div key={n} className="space-y-2">
                      {names.length > 1 && <p className="text-sm font-semibold text-green-900">{n}</p>}
                      {sections.filter((s) => s.courseName === n).map((s) => (
                        <SectionOption key={s.sectionId} section={s} selected={picks[c.id] === s.sectionId}
                          clash={clashesWith(s, others)} onPick={() => pick(c.id, s.sectionId)} />
                      ))}
                    </div>
                  ))}
                </div>
              </fieldset>
            )
          })}
        </div>
      </div>

      {naming && <NameScheduleDialog defaultName="My schedule" onSave={saveNamed} onCancel={() => setNaming(false)} />}
    </section>
  )
}

/** Total idle time between classes on the same day, for the summary line. */
function gapMinutes(sections: Section[]): number {
  const byDay = new Map<string, { s: number; e: number }[]>()
  for (const sec of sections) for (const m of sec.meetings) byDay.set(m.day, [...(byDay.get(m.day) ?? []), { s: toMinutes(m.start), e: toMinutes(m.end) }])
  let gap = 0
  for (const list of byDay.values()) {
    list.sort((a, b) => a.s - b.s)
    for (let i = 1; i < list.length; i++) gap += Math.max(0, list[i].s - list[i - 1].e)
  }
  return gap
}

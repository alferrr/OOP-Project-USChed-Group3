'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSavedActions, useSyncSavedSchedules } from '../api/hooks'
import PageTitle from '../components/layout/PageTitle'
import SavedScheduleDialog, { termLabel } from '../components/schedule/SavedScheduleDialog'
import SchedulePreview from '../components/schedule/SchedulePreview'
import { useSavedStore } from '../store/planStore'

/** Saved schedules as preview cards; clicking one opens the full schedule. */
export default function SavedSchedulesPage() {
  const saved = useSavedStore((s) => s.saved)
  const load = useSyncSavedSchedules()
  const { remove, error } = useSavedActions()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = saved.find((x) => x.id === openId) ?? null

  return (
    <section>
      <PageTitle title="Saved schedules">Click a card to see the whole schedule. Enroll manually in the official ISMIS.</PageTitle>

      {error && <p role="alert" className="alert-error mb-4">Couldn't update your saved schedules: {error}</p>}
      {load.isError && <p role="alert" className="alert-error mb-4">Couldn't load your saved schedules. Try again in a moment.</p>}

      {saved.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-lg text-green-900/80">{load.isLoading ? 'Loading your saved schedules…' : 'No saved schedules yet.'}</p>
          {!load.isLoading && (
            <>
              <p className="mt-1 text-sm text-green-900/70">Generate schedules, then press Save on the one you like.</p>
              <Link href="/courses" className="btn btn-primary mt-4">Choose your courses</Link>
            </>
          )}
        </div>
      ) : (
        <ul aria-label="Saved schedules" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((x) => {
            const codes = [...new Set(x.schedule.sections.map((s) => s.courseCode))]
            return (
              <li key={x.id}>
                <button type="button" onClick={() => setOpenId(x.id)} aria-label={`Open ${x.name}`}
                  className="surface block w-full p-4 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <SchedulePreview sections={x.schedule.sections} />
                  <h2 className="mt-3 truncate text-lg font-extrabold text-green-900">{x.name}</h2>
                  <p className="text-sm text-green-900/70">
                    {termLabel(x.semester, x.academicYear)} · {codes.length} {codes.length === 1 ? 'course' : 'courses'} · {x.schedule.stats.totalUnits} units · {x.schedule.stats.schoolDays} days
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-green-900/60">{codes.join(', ')}</p>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && <SavedScheduleDialog item={open} onClose={() => setOpenId(null)} onRemove={(item) => { remove(item); setOpenId(null) }} />}
    </section>
  )
}

'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import PageTitle from '../components/layout/PageTitle'
import WeeklyCalendar from '../components/schedule/WeeklyCalendar'
import { decodeSchedule } from '../lib/shareSchedule'
import { describeMeetings } from '../lib/time'

const subscribeToHash = (notify: () => void) => {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}

/** window.location.hash, kept in sync with the address bar. null on the server and during hydration. */
function useHash(): string | null {
  return useSyncExternalStore(subscribeToHash, () => window.location.hash, () => null)
}

const TERM_LABEL = { '1ST': '1st Semester', '2ND': '2nd Semester', SUMMER: 'Summer' } as const

/** A schedule someone shared by link. Read-only, no sign-in: the whole schedule travels in the URL fragment. */
export default function SharedSchedulePage() {
  const hash = useHash()
  if (hash === null) return null // the schedule lives in the URL fragment, which the server never sees
  const schedule = decodeSchedule(hash.replace(/^#/, ''))

  if (!schedule) {
    return (
      <section>
        <PageTitle title="Shared schedule" />
        <div className="surface p-8 text-center">
          <p className="text-lg text-green-900/80">This link doesn't contain a valid schedule. It may have been cut off when it was copied.</p>
          <Link href="/courses" className="btn btn-primary mt-4">Plan your own</Link>
        </div>
      </section>
    )
  }

  const units = schedule.sections.reduce((sum, s) => sum + s.units, 0)
  return (
    <section>
      <PageTitle title="Shared schedule">
        {TERM_LABEL[schedule.semester]}, A.Y. {schedule.academicYear} · {schedule.sections.length} sections · {units} units.
        This is a plan, not an enrollment: seats and times may have changed, so check the official ISMIS.
      </PageTitle>
      <div className="space-y-6">
        <WeeklyCalendar sections={schedule.sections} />
        <ul className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {schedule.sections.map((s) => (
            <li key={s.sectionId} className="surface p-4">
              <p className="text-base font-bold text-green-900">{s.courseCode} · Section {s.sectionCode}</p>
              <p className="text-green-900/80">{s.courseName} · {s.instructor ?? 'Instructor TBA'}</p>
              {describeMeetings(s.meetings).map((l) => <p key={l} className="text-green-900/70">{l}</p>)}
            </li>
          ))}
        </ul>
        <Link href="/courses" className="btn btn-primary">Plan your own schedule</Link>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { BookOpen, FileCheck2, LogOut, MonitorSmartphone, Search, Trash2, Users } from 'lucide-react'
import { useEndSession } from '../../api/hooks'
import type { AdminConsentRow, AdminCourseRow, AdminSearchRow, AdminSessionRow, AdminStudentRow } from '../../api/types'
import { ago, nf, SEMESTER_LABEL } from '../../components/admin/AdminUi'
import DeleteStudentDialog from '../../components/admin/DeleteStudentDialog'
import TablePage from '../../components/admin/TablePage'

const mono = 'font-semibold tabular-nums'
const muted = 'text-green-900/70'
const term = (semester: string, year: string) => `${SEMESTER_LABEL[semester] ?? semester} ${year}`
const clock = (iso: string) => new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export function AdminStudentsPage() {
  const [target, setTarget] = useState<string | null>(null)
  return (
    <>
      <TablePage<AdminStudentRow> icon={<Users size={20} />} title="Students" resource="students" empty="No students have used USChed yet."
        columns={[
          { header: 'Student ID number', cell: (r) => <span className={mono}>{r.student}</span> },
          { header: 'Courses', cell: (r) => nf.format(r.courses), className: 'text-right' },
          { header: 'Searches', cell: (r) => nf.format(r.searches), className: 'text-right' },
          { header: 'Last active', cell: (r) => <span className={muted}>{r.lastActive ? ago(r.lastActive) : '–'}</span> },
          { header: 'Actions', className: 'text-right', cell: (r) => (
            <button type="button" onClick={() => setTarget(r.student)} aria-label={`Delete data for ${r.student}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">
              <Trash2 size={14} aria-hidden /> Delete data
            </button>
          ) },
        ]} />
      {target && <DeleteStudentDialog student={target} onClose={() => setTarget(null)} />}
    </>
  )
}

export function AdminCoursesPage() {
  return (
    <TablePage<AdminCourseRow> icon={<BookOpen size={20} />} title="Courses" resource="courses" searchable empty="No courses match."
      columns={[
        { header: 'Code', cell: (r) => <span className={mono}>{r.code}</span> },
        { header: 'Name', cell: (r) => r.name },
        { header: 'Department', cell: (r) => <span className={muted}>{r.department || '–'}</span> },
        { header: 'Units', cell: (r) => r.units, className: 'text-right' },
        { header: 'Students', cell: (r) => nf.format(r.students), className: 'text-right' },
      ]} />
  )
}

export function AdminSearchesPage() {
  return (
    <TablePage<AdminSearchRow> icon={<Search size={20} />} title="Searches" resource="searches" empty="No searches yet."
      columns={[
        { header: 'Student', cell: (r) => <span className={mono}>{r.student}</span> },
        { header: 'Term', cell: (r) => term(r.semester, r.academicYear) },
        { header: 'Source', cell: (r) => <span className={muted}>{r.source}</span> },
        { header: 'Courses', cell: (r) => nf.format(r.courses), className: 'text-right' },
        { header: 'Sections', cell: (r) => nf.format(r.sections), className: 'text-right' },
        { header: 'Skipped', cell: (r) => nf.format(r.skipped), className: 'text-right' },
        { header: 'When', cell: (r) => <span className={muted}>{clock(r.at)}</span> },
      ]} />
  )
}

export function AdminConsentsPage() {
  const yes = (v: boolean) => <span className={v ? 'font-medium text-green-600' : 'font-medium text-red-600'}>{v ? 'Yes' : 'No'}</span>
  return (
    <TablePage<AdminConsentRow> icon={<FileCheck2 size={20} />} title="Consents" resource="consents" empty="No consent records yet."
      columns={[
        { header: 'Session', cell: (r) => <span className={mono}>{r.session}</span> },
        { header: 'Terms version', cell: (r) => r.termsVersion },
        { header: 'Terms', cell: (r) => yes(r.agreedTerms) },
        { header: 'Credential use', cell: (r) => yes(r.agreedCredentialUse) },
        { header: 'Accepted', cell: (r) => <span className={muted}>{clock(r.at)}</span> },
      ]} />
  )
}

function EndSessionButton({ student }: { student: string }) {
  const end = useEndSession()
  return (
    <button type="button" disabled={end.isPending} onClick={() => end.mutate(student)} aria-label={`End session for ${student}`}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
      <LogOut size={14} aria-hidden /> {end.isPending ? 'Ending…' : 'End session'}
    </button>
  )
}

export function AdminSessionsPage() {
  return (
    <TablePage<AdminSessionRow> icon={<MonitorSmartphone size={20} />} title="Sessions" resource="sessions" empty="Nobody is signed in right now."
      columns={[
        { header: 'Student', cell: (r) => <span className={mono}>{r.student}</span> },
        { header: 'Signed in', cell: (r) => <span className={muted}>{ago(r.signedInAt)}</span> },
        { header: 'Last used', cell: (r) => <span className={muted}>{ago(r.lastUsed)}</span> },
        { header: 'Expires', cell: (r) => <span className={muted}>{clock(r.expiresAt)}</span> },
        { header: 'State', cell: (r) => (r.busy ? 'Searching' : 'Idle') },
        { header: 'Actions', className: 'text-right', cell: (r) => <EndSessionButton student={r.student} /> },
      ]} />
  )
}

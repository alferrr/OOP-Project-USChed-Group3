'use client'

import { BookOpen, FileCheck2, MonitorSmartphone, Search, Users } from 'lucide-react'
import type { AdminConsentRow, AdminCourseRow, AdminSearchRow, AdminSessionRow, AdminStudentRow } from '../../api/types'
import { ago, nf, SEMESTER_LABEL } from '../../components/admin/AdminUi'
import TablePage from '../../components/admin/TablePage'

const mono = 'font-mono font-medium'
const muted = 'text-green-900/70'
const term = (semester: string, year: string) => `${SEMESTER_LABEL[semester] ?? semester} ${year}`
const clock = (iso: string) => new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

export function AdminStudentsPage() {
  return (
    <TablePage<AdminStudentRow> icon={<Users size={20} />} title="Students" resource="students" empty="No students have used USChed yet."
      columns={[
        { header: 'ID number', cell: (r) => <span className={mono}>{r.student}</span> },
        { header: 'Courses', cell: (r) => nf.format(r.courses), className: 'text-right' },
        { header: 'Searches', cell: (r) => nf.format(r.searches), className: 'text-right' },
        { header: 'Last active', cell: (r) => <span className={muted}>{r.lastActive ? ago(r.lastActive) : '–'}</span> },
      ]} />
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

export function AdminSessionsPage() {
  return (
    <TablePage<AdminSessionRow> icon={<MonitorSmartphone size={20} />} title="Sessions" resource="sessions" empty="Nobody is signed in right now."
      columns={[
        { header: 'Student', cell: (r) => <span className={mono}>{r.student}</span> },
        { header: 'Signed in', cell: (r) => <span className={muted}>{ago(r.signedInAt)}</span> },
        { header: 'Last used', cell: (r) => <span className={muted}>{ago(r.lastUsed)}</span> },
        { header: 'Expires', cell: (r) => <span className={muted}>{clock(r.expiresAt)}</span> },
        { header: 'State', cell: (r) => (r.busy ? 'Searching' : 'Idle') },
      ]} />
  )
}

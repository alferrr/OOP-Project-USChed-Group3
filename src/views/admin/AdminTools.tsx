'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { BarChart3, CheckCircle2, HeartPulse, Megaphone, ScrollText, ShieldCheck, TriangleAlert, Upload, XCircle } from 'lucide-react'
import { useAdminAnnouncement, useAdminHealth, useAdminInsights, useAdminTable, useImportCsv, useSaveAnnouncement } from '../../api/hooks'
import { ApiError } from '../../api/client'
import type { AdminAdminRow, AdminAnnouncementRow, AdminAuditRow, AdminIsmisEventRow, FailureKind } from '../../api/types'
import { ago, AdminCard, DataTable, Kpi, nf, PageHeader, Pager, Toolbar } from '../../components/admin/AdminUi'
import TablePage from '../../components/admin/TablePage'
import { BannerView } from '../../components/announcement/AnnouncementBanner'

const clock = (iso: string) => new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const pct = (n: number) => `${Math.round(n * 100)}%`

// ---- Usage insights -------------------------------------------------------------------------------------

export function AdminInsightsPage() {
  const q = useAdminInsights()
  const d = q.data
  const top = Math.max(1, ...(d?.topCourses ?? []).map((c) => c.searches))
  return (
    <div>
      <PageHeader icon={<BarChart3 size={20} />} title="Usage insights" />
      <Toolbar status={d ? 'Counted anonymously over the last 30 days' : q.isError ? 'Could not load' : 'Loading…'} loading={q.isFetching} onRefresh={() => q.refetch()} />
      <div className="space-y-5 p-6">
        {q.isError && <div role="alert" className="alert-error">{q.error instanceof Error ? q.error.message : 'Something went wrong.'}</div>}
        {d && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={<BarChart3 size={16} />} label="Generations, 7 days" value={d.generations.last7d} info="Times a student pressed Generate Schedules in the last 7 days" hint="schedule runs" />
              <Kpi icon={<BarChart3 size={16} />} label="Generations, 30 days" value={d.generations.last30d} info="Times a student pressed Generate Schedules in the last 30 days" hint="schedule runs" />
              <Kpi icon={<BarChart3 size={16} />} label="Courses per run" value={d.generations.avgCourses} info="Average number of courses selected when generating" hint="on average" />
              <Kpi icon={<BarChart3 size={16} />} label="Without preferences" value={Math.round(d.generations.withoutPreferences * 100)} info="Share of runs where no preference was set" hint="percent of runs" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminCard title="Most searched courses">
                {d.topCourses.length === 0 ? <p className="mt-4 text-sm text-green-900/60">No searches counted yet.</p> : (
                  <ul className="mt-4 space-y-3">
                    {d.topCourses.map((c) => (
                      <li key={c.code} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm">
                        <span className="font-semibold text-green-900">{c.code}</span>
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 rounded-sm bg-gradient-to-r from-green-300 to-green-600" style={{ width: `${Math.max(4, (c.searches / top) * 100)}%` }} />
                          <span className="text-xs text-green-900/60">{nf.format(c.searches)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminCard>
              <AdminCard title="Preferences students use">
                {d.preferences.length === 0 ? <p className="mt-4 text-sm text-green-900/60">No preferences used yet.</p> : (
                  <ul className="mt-4 space-y-3">
                    {d.preferences.map((p) => (
                      <li key={p.key} className="grid grid-cols-[10.5rem_1fr] items-center gap-3 text-sm">
                        <span className="text-green-900">{p.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 rounded-sm bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${Math.max(4, p.share * 100)}%` }} />
                          <span className="text-xs text-green-900/60">{pct(p.share)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </AdminCard>
            </div>
            <p className="text-sm text-green-900/60">These counts never include a student ID or name. They only record what was done.</p>
          </>
        )}
      </div>
    </div>
  )
}

// ---- ISMIS health ---------------------------------------------------------------------------------------

const STATUS = {
  healthy: { label: 'Healthy', text: 'No problems reading ISMIS lately.', cls: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  degraded: { label: 'Degraded', text: 'ISMIS has been unreachable or asking for a CAPTCHA several times in the last hour.', cls: 'bg-gold-100 text-green-900', Icon: TriangleAlert },
  broken: { label: 'Needs attention', text: 'ISMIS\'s pages changed shape in the last 24 hours, so reading them probably no longer works. The scraper needs updating.', cls: 'bg-red-50 text-red-800', Icon: XCircle },
} as const

const KINDS: { kind: FailureKind; label: string; note: string }[] = [
  { kind: 'LAYOUT_CHANGED', label: 'Page layout changed', note: 'The scraper no longer recognises ISMIS pages' },
  { kind: 'UNAVAILABLE', label: 'ISMIS unreachable', note: 'Timeouts and server errors' },
  { kind: 'CHALLENGE', label: 'CAPTCHA or verification code', note: 'USChed stops instead of getting past it' },
  { kind: 'AUTH_FAILED', label: 'Wrong ID or password', note: 'Students\' own mistakes; not counted against ISMIS' },
]
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.kind, k.label]))

export function AdminHealthPage() {
  const q = useAdminHealth()
  const [page, setPage] = useState(0)
  const events = useAdminTable<AdminIsmisEventRow>('ismis-events', page)
  const d = q.data
  const s = d ? STATUS[d.status] : null
  return (
    <div>
      <PageHeader icon={<HeartPulse size={20} />} title="ISMIS health" />
      <Toolbar status={d ? 'Checked just now' : q.isError ? 'Could not load' : 'Loading…'} loading={q.isFetching} onRefresh={() => { void q.refetch(); void events.refetch() }} />
      <div className="space-y-5 p-6">
        {q.isError && <div role="alert" className="alert-error">{q.error instanceof Error ? q.error.message : 'Something went wrong.'}</div>}
        {d && s && (
          <>
            <section className={`adm-card flex items-start gap-4 p-5 ${s.cls}`}>
              <s.Icon size={28} aria-hidden />
              <div>
                <h2 className="text-lg font-semibold">{s.label}</h2>
                <p className="text-sm">{s.text}</p>
                <p className="mt-2 text-xs opacity-80">
                  Last successful search: {d.lastSuccessfulSearch ? ago(d.lastSuccessfulSearch) : 'none yet'}
                  {d.lastFailure && <> · Last failure: {KIND_LABEL[d.lastFailure.kind] ?? d.lastFailure.kind}, {ago(d.lastFailure.at)}</>}
                </p>
              </div>
            </section>
            <AdminCard title="Failures">
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead><tr className="border-b border-green-100 text-xs font-medium uppercase tracking-wide text-green-900/60">
                    <th scope="col" className="py-2 pr-4">What happened</th><th scope="col" className="px-4 py-2 text-right">24 hours</th><th scope="col" className="py-2 pl-4 text-right">7 days</th>
                  </tr></thead>
                  <tbody className="divide-y divide-green-100">
                    {KINDS.map((k) => (
                      <tr key={k.kind}>
                        <td className="py-3 pr-4"><span className="font-medium text-green-900">{k.label}</span><span className="block text-xs text-green-900/60">{k.note}</span></td>
                        <td className="px-4 py-3 text-right font-semibold text-green-900">{d.last24h[k.kind]}</td>
                        <td className="py-3 pl-4 text-right text-green-900/70">{d.last7d[k.kind]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          </>
        )}
        <section className="adm-card">
          <h2 className="px-5 pt-5 text-sm font-medium text-green-900">Recent failures</h2>
          <DataTable<AdminIsmisEventRow> loading={events.isLoading} rows={events.data?.items} empty="No failures recorded."
            columns={[
              { header: 'What happened', cell: (r) => KIND_LABEL[r.kind] ?? r.kind },
              { header: 'When', cell: (r) => <span className="text-green-900/70">{clock(r.at)}</span> },
            ]} />
          {events.data && <Pager page={events.data.page} size={events.data.size} total={events.data.total} onPage={setPage} />}
        </section>
      </div>
    </div>
  )
}

// ---- Announcement ---------------------------------------------------------------------------------------

export function AdminAnnouncementPage() {
  const q = useAdminAnnouncement()
  const save = useSaveAnnouncement()
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'info' | 'warning'>('info')
  const [active, setActive] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [histPage, setHistPage] = useState(0)
  const history = useAdminTable<AdminAnnouncementRow>('announcements', histPage)
  useEffect(() => {
    if (q.data && !loaded) {
      setMessage(q.data.message); setTone(q.data.tone); setActive(q.data.active); setLoaded(true)
    }
  }, [q.data, loaded])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ message, tone, active }, { onSuccess: () => setSavedAt(Date.now()) })
  }
  const err = save.error instanceof ApiError ? save.error.message : null
  return (
    <div>
      <PageHeader icon={<Megaphone size={20} />} title="Announcement" />
      <Toolbar status={q.data ? (q.data.active ? 'Showing to students now' : 'Not showing') : 'Loading…'} loading={q.isFetching} onRefresh={() => q.refetch()} />
      <div className="grid gap-5 p-6 lg:grid-cols-2">
        <form onSubmit={submit} className="adm-card space-y-4 p-5">
          <div>
            <label className="block">
              <span className="text-sm font-medium text-green-900">Message</span>
              <textarea value={message} maxLength={280} rows={4} onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. ISMIS enrollment opens on Nov 25. Plan your schedule early!"
                className="mt-1.5 w-full rounded-lg border border-green-200 bg-white p-3 text-sm text-green-900 focus:border-green-600 focus:outline-none" />
            </label>
            <span className="mt-1 block text-right text-xs text-green-900/60">{message.length}/280</span>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-green-900">Look</legend>
            <div className="mt-1.5 flex gap-4 text-sm text-green-900">
              {(['info', 'warning'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2"><input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} className="accent-green-700" />{t === 'info' ? 'Information' : 'Warning'}</label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-green-900">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-green-700" />
            Show this to students (also on the login page)
          </label>
          {err && <p role="alert" className="alert-error">{err}</p>}
          {savedAt && !err && <p role="status" className="text-sm font-medium text-green-600">Saved.</p>}
          <button type="submit" disabled={save.isPending || !loaded} className="adm-btn adm-btn-primary">{save.isPending ? 'Saving…' : 'Save'}</button>
        </form>
        <div>
          <h2 className="mb-2 text-sm font-medium text-green-900">Preview</h2>
          <div className="overflow-hidden rounded-xl border border-green-100">
            {message.trim() ? <BannerView message={message} tone={tone} /> : <p className="bg-green-50 px-4 py-3 text-sm text-green-900/60">Type a message to see how it looks.</p>}
          </div>
          <p className="mt-2 text-xs text-green-900/60">Students can dismiss it for the rest of their visit. Changing the message shows it to them again.</p>
        </div>
      </div>

      <div className="px-6 pb-6">
        <section className="adm-card">
          <h2 className="px-5 pt-5 text-sm font-medium text-green-900">Recent announcements</h2>
          <p className="px-5 pt-1 text-xs text-green-900/60">Every save is recorded here, whether it switched the banner on or off.</p>
          <DataTable<AdminAnnouncementRow> loading={history.isLoading} rows={history.data?.items} empty="No announcements saved yet."
            columns={[
              { header: 'When', cell: (r) => <span className="text-green-900/70">{clock(r.at)}</span> },
              { header: 'Message', cell: (r) => <span className="whitespace-pre-wrap">{r.message || '–'}</span> },
              { header: 'Look', cell: (r) => (r.tone === 'warning' ? 'Warning' : 'Information') },
              { header: 'Status', cell: (r) => <span className={r.active ? 'font-semibold text-green-600' : 'text-green-900/60'}>{r.active ? 'Shown' : 'Off'}</span> },
              { header: 'By', cell: (r) => <span className="tabular-nums">{r.admin}</span> },
              { header: '', className: 'text-right', cell: (r) => (
                <button type="button" onClick={() => { setMessage(r.message); setTone(r.tone === 'warning' ? 'warning' : 'info'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  aria-label={`Reuse announcement: ${r.message}`} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50">Reuse</button>
              ) },
            ]} />
          {history.data && <Pager page={history.data.page} size={history.data.size} total={history.data.total} onPage={setHistPage} />}
        </section>
      </div>
    </div>
  )
}

// ---- Import courses -------------------------------------------------------------------------------------

export function AdminImportPage() {
  const imp = useImportCsv()
  const [student, setStudent] = useState('')
  const [semester, setSemester] = useState('1ST')
  const now = new Date()
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  const [year, setYear] = useState(`${start}-${start + 1}`)
  const [file, setFile] = useState<File | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    const form = new FormData()
    form.set('file', file)
    form.set('semester', semester)
    form.set('academicYear', year.trim())
    form.set('studentIdNumber', student.trim())
    imp.mutate(form)
  }
  const err = imp.error instanceof ApiError ? imp.error.message : null
  const field = 'mt-1.5 w-full rounded-lg border border-green-200 bg-white p-2.5 text-sm text-green-900 focus:border-green-600 focus:outline-none'
  return (
    <div>
      <PageHeader icon={<Upload size={20} />} title="Import courses" />
      <div className="grid gap-5 p-6 lg:grid-cols-2">
        <form onSubmit={submit} className="adm-card space-y-4 p-5">
          <label className="block"><span className="text-sm font-medium text-green-900">Student ID number</span>
            <input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="Whose private catalog this goes into" className={field} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-sm font-medium text-green-900">Semester</span>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className={field}>
                <option value="1ST">1st Semester</option><option value="2ND">2nd Semester</option><option value="SUMMER">Summer</option>
              </select></label>
            <label className="block"><span className="text-sm font-medium text-green-900">Academic year</span>
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026-2027" className={field} /></label>
          </div>
          <label className="block"><span className="text-sm font-medium text-green-900">CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={field} /></label>
          {err && <p role="alert" className="alert-error">{err}</p>}
          <button type="submit" disabled={!file || student.trim() === '' || year.trim() === '' || imp.isPending} className="adm-btn adm-btn-primary">{imp.isPending ? 'Importing…' : 'Import'}</button>
          {imp.data && (
            <div role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">Imported {imp.data.courses} courses and {imp.data.sections} sections.</p>
              {imp.data.skipped > 0 && <p className="mt-1">{imp.data.skipped} rows were skipped.</p>}
              {imp.data.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-green-900/80">{imp.data.errors.slice(0, 10).map((x, i) => <li key={i}>{x}</li>)}</ul>}
            </div>
          )}
        </form>
        <AdminCard title="CSV format">
          <p className="mt-2 text-sm text-green-900/80">One row per class meeting, with a header row. Rows that are not valid are skipped and listed after the import.</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-green-900/60">Required columns</p>
          <p className="mt-1 text-sm text-green-900">semester, academic_year, course_code, course_name, section_code, units, day, start_time, end_time</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-green-900/60">Optional columns</p>
          <p className="mt-1 text-sm text-green-900">room, campus, meeting_type, instructor, available_slots, department, prerequisites</p>
        </AdminCard>
      </div>
    </div>
  )
}

// ---- Audit log, admins ----------------------------------------------------------------------------------

const ACTION_LABEL: Record<string, string> = {
  DELETE_STUDENT_DATA: 'Deleted a student\'s data', END_SESSION: 'Ended a session', IMPORT_CSV: 'Imported a CSV',
  ANNOUNCEMENT_ON: 'Announcement on', ANNOUNCEMENT_OFF: 'Announcement off',
}

export function AdminAuditPage() {
  return (
    <TablePage<AdminAuditRow> icon={<ScrollText size={20} />} title="Audit log" resource="audit" empty="No admin actions yet."
      columns={[
        { header: 'When', cell: (r) => <span className="text-green-900/70">{clock(r.at)}</span> },
        { header: 'Admin', cell: (r) => <span className="font-semibold tabular-nums">{r.admin}</span> },
        { header: 'Action', cell: (r) => ACTION_LABEL[r.action] ?? r.action },
        { header: 'Student', cell: (r) => <span className="tabular-nums">{r.target || '–'}</span> },
        { header: 'Details', cell: (r) => <span className="text-green-900/70">{r.detail || '–'}</span> },
      ]} />
  )
}

export function AdminAdminsPage() {
  return (
    <div>
      <TablePage<AdminAdminRow> icon={<ShieldCheck size={20} />} title="Admins" resource="admins" empty="No admins are configured."
        columns={[
          { header: 'Student ID number', cell: (r) => <span className="font-semibold tabular-nums">{r.student}</span> },
          { header: 'Set by', cell: (r) => <span className="text-green-900/70">{r.source}</span> },
        ]} />
      <p className="px-6 pb-6 text-sm text-green-900/70">
        This list is read-only. To change who is an admin, set <code className="rounded bg-green-50 px-1.5 py-0.5">UCHED_ADMIN_IDS</code> in the
        server&apos;s <code className="rounded bg-green-50 px-1.5 py-0.5">.env</code> (comma-separated student ID numbers) and restart the server.
      </p>
    </div>
  )
}

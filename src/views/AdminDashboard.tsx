'use client'

import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, BookOpen, Check, Download, FileCheck2, RefreshCw, Search, Users } from 'lucide-react'
import { useAdminStats } from '../api/hooks'
import type { AdminStats } from '../api/types'
import { useIsmisStore } from '../store/ismisStore'

const SEMESTER_LABEL: Record<string, string> = { '1ST': '1st sem', '2ND': '2nd sem', SUMMER: 'Summer' }
const nf = new Intl.NumberFormat('en-US')

function delta(now: number, before: number): { pct: number; up: boolean } | null {
  if (before === 0) return now === 0 ? null : { pct: 100, up: true }
  const pct = Math.round(((now - before) / before) * 100)
  return pct === 0 ? null : { pct: Math.abs(pct), up: pct > 0 }
}

function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

/** 1, 2, 5 x 10^n at or above `max`, so gridlines land on round numbers. */
function niceMax(max: number): number {
  if (max <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(max))
  return ([1, 2, 5, 10].find((m) => m * pow >= max) ?? 10) * pow
}

function Card({ title, children, action, className = '' }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`surface p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-green-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Kpi({ icon, label, value, now, before, hint }: { icon: ReactNode; label: string; value: number; now?: number; before?: number; hint: string }) {
  const d = now !== undefined && before !== undefined ? delta(now, before) : null
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-green-50 text-green-700" aria-hidden>{icon}</span>
        <span className="text-sm font-semibold text-green-900">{label}</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-extrabold tracking-tight text-green-900">{nf.format(value)}</span>
          {d && (
            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold ${d.up ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {d.up ? <ArrowUp size={11} aria-hidden /> : <ArrowDown size={11} aria-hidden />}{d.pct}%
              <span className="sr-only">{d.up ? 'up' : 'down'}</span>
            </span>
          )}
        </div>
        <span className="pb-1 text-xs text-green-900/60">{hint}</span>
      </div>
    </div>
  )
}

function SearchesChart({ data }: { data: AdminStats['searchesByMonth'] }) {
  const [range, setRange] = useState<6 | 12>(12)
  const [hover, setHover] = useState<number | null>(null)
  const rows = data.slice(-range)
  const peak = niceMax(Math.max(0, ...rows.map((r) => r.searches)))
  const total = rows.reduce((n, r) => n + r.searches, 0)
  const last = rows.length - 1
  const active = hover ?? last
  const ticks = [peak, (peak * 3) / 4, peak / 2, peak / 4, 0]

  return (
    <Card title="Catalog searches" className="lg:col-span-2"
      action={
        <div role="group" aria-label="Range" className="flex rounded-xl bg-green-50 p-1 text-xs font-bold">
          {([6, 12] as const).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); setHover(null) }}
              className={`rounded-lg px-3 py-1.5 transition-colors ${range === r ? 'bg-white text-green-900 shadow-sm' : 'text-green-900/60 hover:text-green-900'}`}>
              {r === 6 ? '6 M' : '1 Y'}
            </button>
          ))}
        </div>
      }>
      <p className="mt-1 text-sm text-green-900/70">
        <span className="font-display text-2xl font-extrabold text-green-900">{nf.format(total)}</span> searches in the last {range === 6 ? '6 months' : 'year'}
      </p>
      <div className="mt-5 flex gap-3">
        <div className="flex h-56 flex-col justify-between pb-6 text-xs text-green-900/50" aria-hidden>
          {ticks.map((t) => <span key={t}>{Math.round(t)}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-56 flex-col justify-between pb-6" aria-hidden>
            {ticks.map((t) => <span key={t} className="border-t border-dashed border-green-100" />)}
          </div>
          <div className="relative flex h-56 items-end gap-2 sm:gap-3" role="list" aria-label="Searches per month">
            {rows.map((r, i) => {
              const pct = peak === 0 ? 0 : (r.searches / peak) * 100
              const on = i === active
              return (
                <button key={r.month} type="button" role="listitem" aria-label={`${r.label}: ${r.searches} searches, ${r.students} students`}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2 outline-none">
                  {on && (
                    <span className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-left text-xs shadow-[var(--shadow-lift)]"
                      style={{ bottom: `calc(${pct}% + 2.25rem)` }}>
                      <span className="block text-green-900/60">{r.label}</span>
                      <span className="block font-display text-base font-extrabold text-green-900">{r.searches} <span className="text-xs font-medium text-green-900/60">searches</span></span>
                      <span className="block text-green-900/60">{r.students} students</span>
                    </span>
                  )}
                  <span className="flex w-full flex-1 items-end">
                    <span className={`w-full rounded-t-lg transition-[height,background-color] duration-500 ${on ? 'bg-green-700' : 'bg-green-100'}`}
                      style={{ height: `${Math.max(pct, r.searches > 0 ? 2 : 0.5)}%` }} />
                  </span>
                  <span className={`h-4 text-xs ${on ? 'font-bold text-green-900' : 'text-green-900/60'}`}>{r.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {total === 0 && <p className="mt-3 text-sm text-green-900/60">No searches yet. They appear here as students pull courses from ISMIS.</p>}
    </Card>
  )
}

function RecentSyncs({ rows }: { rows: AdminStats['recent'] }) {
  return (
    <Card title="Recent searches">
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-green-900/60">Nothing yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map((r, i) => (
            <li key={`${r.student}-${r.at}-${i}`} className="rounded-2xl bg-green-50 px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm font-bold text-green-900">{r.student}</span>
                <span className="text-xs text-green-900/60">{ago(r.at)}</span>
              </div>
              <p className="mt-0.5 text-xs text-green-900/70">
                {SEMESTER_LABEL[r.semester] ?? r.semester} {r.academicYear} · {r.courses} courses · {r.sections} sections
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function TermsCard({ rows }: { rows: AdminStats['terms'] }) {
  const peak = Math.max(1, ...rows.map((r) => r.sections))
  return (
    <Card title="Catalog by term">
      {rows.length === 0 ? <p className="mt-4 text-sm text-green-900/60">No terms imported yet.</p> : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 5).map((r) => (
            <li key={`${r.academicYear}-${r.semester}`}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-green-900">{SEMESTER_LABEL[r.semester] ?? r.semester} · {r.academicYear}</span>
                <span className="text-green-900/70">{nf.format(r.sections)} sections</span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-green-50">
                <div className="h-full rounded-full bg-gradient-to-r from-green-300 to-green-600" style={{ width: `${(r.sections / peak) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function DepartmentsCard({ rows }: { rows: AdminStats['topDepartments'] }) {
  const total = rows.reduce((n, r) => n + r.courses, 0)
  return (
    <Card title="Top departments">
      {rows.length === 0 ? <p className="mt-4 text-sm text-green-900/60">No courses yet.</p> : (
        <ol className="mt-3 divide-y divide-green-100">
          {rows.map((r, i) => (
            <li key={r.department} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-4 text-green-900/50">{i + 1}</span>
              <span className="flex-1 truncate font-medium text-green-900">{r.department}</span>
              <span className="text-green-900/70">{nf.format(r.courses)}</span>
              <span className="w-12 text-right font-bold text-green-900">{total === 0 ? 0 : Math.round((r.courses / total) * 100)}%</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function RetentionCard({ retention, months }: { retention: AdminStats['retention']; months: AdminStats['searchesByMonth'] }) {
  const recent = months.slice(-7)
  const peak = Math.max(1, ...recent.map((m) => m.students))
  return (
    <Card title="Returning students">
      <p className="mt-1 text-sm text-green-900/70">
        <span className="font-display text-3xl font-extrabold text-green-900">{Math.round(retention.rate * 100)}%</span>{' '}
        {retention.returning} of {retention.total} searched more than once
      </p>
      <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label="Active students per month">
        {recent.map((m, i) => (
          <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className={`w-full rounded-t-md ${i === recent.length - 1 ? 'bg-gold-400' : 'bg-green-200'}`}
              style={{ height: `${Math.max((m.students / peak) * 100, m.students > 0 ? 4 : 1)}%` }} title={`${m.students} students`} />
            <span className={`text-[0.7rem] ${i === recent.length - 1 ? 'font-bold text-green-900' : 'text-green-900/60'}`}>{m.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function toCsv(stats: AdminStats): string {
  const lines = ['month,searches,students', ...stats.searchesByMonth.map((r) => `${r.month},${r.searches},${r.students}`)]
  return lines.join('\n')
}

function downloadCsv(stats: AdminStats) {
  const url = URL.createObjectURL(new Blob([toCsv(stats)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'usched-searches.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminDashboard() {
  const isAdmin = useIsmisStore((s) => s.isAdmin)
  const stats = useAdminStats(isAdmin)
  const d = stats.data

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-green-100 bg-white/90 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-extrabold text-green-900">Dashboard</h1>
      </header>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-600" aria-live="polite">
            <Check size={16} aria-hidden />
            {d ? `Last updated ${ago(d.generatedAt)}` : stats.isError ? 'Could not load the numbers' : 'Loading…'}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => stats.refetch()} disabled={stats.isFetching} className="btn btn-quiet">
              <RefreshCw size={15} className={stats.isFetching ? 'animate-spin' : ''} aria-hidden /> Refresh
            </button>
            <button type="button" onClick={() => d && downloadCsv(d)} disabled={!d} className="btn btn-gold">
              <Download size={15} aria-hidden /> Export CSV
            </button>
          </div>
        </div>

        {stats.isError && (
          <div role="alert" className="alert-error">{stats.error instanceof Error ? stats.error.message : 'Something went wrong.'}</div>
        )}

        {d && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={<Users size={18} />} label="Students" value={d.kpis.students} hint={`${d.kpis.activeSessions} signed in now`} />
              <Kpi icon={<BookOpen size={18} />} label="Courses" value={d.kpis.courses} hint={`${nf.format(d.kpis.sections)} sections`} />
              <Kpi icon={<Search size={18} />} label="Searches" value={d.kpis.searchesThisWeek} now={d.kpis.searchesThisWeek} before={d.kpis.searchesLastWeek} hint="vs last week" />
              <Kpi icon={<FileCheck2 size={18} />} label="Consents" value={d.kpis.consentsThisWeek} now={d.kpis.consentsThisWeek} before={d.kpis.consentsLastWeek} hint="vs last week" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <SearchesChart data={d.searchesByMonth} />
              <RecentSyncs rows={d.recent} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <TermsCard rows={d.terms} />
              <DepartmentsCard rows={d.topDepartments} />
              <RetentionCard retention={d.retention} months={d.searchesByMonth} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

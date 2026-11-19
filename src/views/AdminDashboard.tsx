'use client'

import { useState } from 'react'
import { BookOpen, Download, FileCheck2, LayoutDashboard, MoreVertical, Search, Users } from 'lucide-react'
import { useAdminStats } from '../api/hooks'
import type { AdminStats } from '../api/types'
import { ago, AdminCard, Kpi, nf, PageHeader, SEMESTER_LABEL, Toolbar } from '../components/admin/AdminUi'
import { useIsmisStore } from '../store/ismisStore'

function delta(now: number, before: number): { pct: number; up: boolean } | null {
  if (before === 0) return now === 0 ? null : { pct: 100, up: true }
  const pct = Math.round(((now - before) / before) * 100)
  return pct === 0 ? null : { pct: Math.abs(pct), up: pct > 0 }
}

/** 1, 2, 5 x 10^n at or above `max`, so gridlines land on round numbers. */
function niceMax(max: number): number {
  if (max <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(max))
  return ([1, 2, 5, 10].find((m) => m * pow >= max) ?? 10) * pow
}

const compact = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n))

function SearchesChart({ data }: { data: AdminStats['searchesByMonth'] }) {
  const [range, setRange] = useState<6 | 12>(12)
  const [hover, setHover] = useState<number | null>(null)
  const rows = data.slice(-range)
  const peak = niceMax(Math.max(0, ...rows.map((r) => r.searches)))
  const total = rows.reduce((n, r) => n + r.searches, 0)
  const active = hover ?? rows.length - 1
  const ticks = [peak, (peak * 3) / 4, peak / 2, peak / 4, 0]

  return (
    <AdminCard title="Searches" className="lg:col-span-2"
      action={
        <div role="group" aria-label="Range" className="flex rounded-lg bg-green-50 p-1 text-xs font-medium">
          {([6, 12] as const).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); setHover(null) }}
              className={`rounded-md px-3.5 py-1.5 transition-colors ${range === r ? 'bg-white text-green-900 shadow-sm' : 'text-green-900/50 hover:text-green-900'}`}>
              {r === 6 ? '6 M' : '1 Y'}
            </button>
          ))}
        </div>
      }>
      <p className="mt-2 flex items-baseline gap-3 text-sm text-green-900/60">
        <span className="font-display text-2xl text-green-900/70">{nf.format(total)}</span>
        in the last {range === 6 ? '6 months' : 'year'}
      </p>
      <div className="mt-6 flex gap-3">
        <div className="flex h-60 flex-col justify-between pb-7 text-xs text-green-900/50" aria-hidden>
          {ticks.map((t) => <span key={t}>{compact(Math.round(t))}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-60 flex-col justify-between pb-7" aria-hidden>
            {ticks.map((t) => <span key={t} className="border-t border-dashed border-green-100" />)}
          </div>
          <div className="relative flex h-60 items-end gap-2 sm:gap-3" role="list" aria-label="Searches per month">
            {rows.map((r, i) => {
              const pct = peak === 0 ? 0 : (r.searches / peak) * 100
              const on = i === active
              return (
                <button key={r.month} type="button" role="listitem" aria-label={`${r.label}: ${r.searches} searches, ${r.students} students`}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  className="relative flex h-full flex-1 flex-col items-center justify-end gap-2.5 outline-none">
                  {on && (
                    <span className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-green-100 bg-white px-3.5 py-2.5 text-left text-xs shadow-sm"
                      style={{ bottom: `calc(${Math.max(pct, 2)}% + 2.75rem)` }}>
                      <span className="block text-green-900/60">{r.label}</span>
                      <span className="mt-0.5 block font-display text-lg font-semibold text-green-900">{r.searches}</span>
                      <span className="block text-green-900/60">{r.students} students</span>
                    </span>
                  )}
                  <span className="relative flex w-full flex-1 items-end">
                    {on && <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-green-900" aria-hidden />}
                    <span className={`relative w-full rounded-sm border-t-2 border-green-600 transition-[height] duration-500 ${on ? 'bg-gradient-to-b from-green-300 to-green-100' : 'bg-green-50'}`}
                      style={{ height: `${Math.max(pct, r.searches > 0 ? 2 : 0.5)}%` }}>
                      {on && <span className="absolute -top-[5px] left-1/2 size-2 -translate-x-1/2 rounded-full border-2 border-white bg-green-900" aria-hidden />}
                    </span>
                  </span>
                  <span className={`h-4 text-xs ${on ? 'font-semibold text-green-700' : 'text-green-900/60'}`}>{r.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {total === 0 && <p className="mt-3 text-sm text-green-900/60">No searches yet. They appear here as students pull courses from ISMIS.</p>}
    </AdminCard>
  )
}

function RecentSearches({ rows }: { rows: AdminStats['recent'] }) {
  return (
    <AdminCard title="Recent searches" action={<MoreVertical size={16} className="text-green-900/50" aria-hidden />}>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-green-900/60">Nothing yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li key={`${r.student}-${r.at}-${i}`} className="rounded-lg bg-green-50/70 px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-green-900">{r.student}</span>
                <span className="text-xs text-green-900/60">{ago(r.at)}</span>
              </div>
              <p className="mt-0.5 text-xs text-green-900/60">
                {SEMESTER_LABEL[r.semester] ?? r.semester} {r.academicYear} · {r.courses} courses · {r.sections} sections
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  )
}

function TermsCard({ rows }: { rows: AdminStats['terms'] }) {
  const peak = Math.max(1, ...rows.map((r) => r.sections))
  return (
    <AdminCard title="Catalog by term" action={<MoreVertical size={16} className="text-green-900/50" aria-hidden />}>
      {rows.length === 0 ? <p className="mt-4 text-sm text-green-900/60">No terms imported yet.</p> : (
        <ul className="mt-5 space-y-3.5">
          {rows.slice(0, 5).map((r) => (
            <li key={`${r.academicYear}-${r.semester}`} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
              <span className="text-green-900">{SEMESTER_LABEL[r.semester] ?? r.semester} {r.academicYear.slice(2)}</span>
              <span className="flex items-center gap-2">
                <span className="h-4 rounded-sm bg-gradient-to-r from-green-300 to-green-600" style={{ width: `${Math.max(4, (r.sections / peak) * 100)}%` }} />
                <span className="text-xs text-green-900/60">{nf.format(r.sections)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  )
}

function DepartmentsCard({ rows }: { rows: AdminStats['topDepartments'] }) {
  const total = rows.reduce((n, r) => n + r.courses, 0)
  return (
    <AdminCard title="Top departments" action={<MoreVertical size={16} className="text-green-900/50" aria-hidden />}>
      {rows.length === 0 ? <p className="mt-4 text-sm text-green-900/60">No courses yet.</p> : (
        <ol className="mt-3">
          {rows.map((r, i) => (
            <li key={r.department} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-4 text-green-900/60">{i + 1}</span>
              <span className="flex-1 truncate text-green-900">{r.department}</span>
              <span className="w-12 text-right font-medium text-green-900">{total === 0 ? 0 : Math.round((r.courses / total) * 100)}%</span>
            </li>
          ))}
        </ol>
      )}
    </AdminCard>
  )
}

function RetentionCard({ retention, months }: { retention: AdminStats['retention']; months: AdminStats['searchesByMonth'] }) {
  const recent = months.slice(-7)
  const peak = Math.max(1, ...recent.map((m) => m.students))
  return (
    <AdminCard title="Returning students" action={<MoreVertical size={16} className="text-green-900/50" aria-hidden />}>
      <p className="mt-2 flex items-baseline gap-2 text-sm text-green-900/60">
        <span className="font-display text-2xl font-semibold text-green-900">{Math.round(retention.rate * 100)}%</span>
        {retention.returning} of {retention.total} searched more than once
      </p>
      <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label="Active students per month">
        {recent.map((m, i) => (
          <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className={`w-full rounded-sm ${i === recent.length - 1 ? 'bg-green-700' : 'bg-green-100'}`}
              style={{ height: `${Math.max((m.students / peak) * 100, m.students > 0 ? 4 : 1)}%` }} title={`${m.students} students`} />
            <span className={`text-[0.7rem] ${i === recent.length - 1 ? 'font-semibold text-green-900' : 'text-green-900/60'}`}>{m.label}</span>
          </div>
        ))}
      </div>
    </AdminCard>
  )
}

function downloadCsv(stats: AdminStats) {
  const csv = ['month,searches,students', ...stats.searchesByMonth.map((r) => `${r.month},${r.searches},${r.students}`)].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
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
      <PageHeader icon={<LayoutDashboard size={20} />} title="Dashboard" />
      <Toolbar status={d ? `Last updated ${ago(d.generatedAt)}` : stats.isError ? 'Could not load the numbers' : 'Loading…'}
        loading={stats.isFetching} onRefresh={() => stats.refetch()}>
        <button type="button" onClick={() => d && downloadCsv(d)} disabled={!d} className="adm-btn adm-btn-primary">
          <Download size={15} aria-hidden /> Export CSV
        </button>
      </Toolbar>
      <div className="space-y-5 p-6">
        {stats.isError && (
          <div role="alert" className="alert-error">{stats.error instanceof Error ? stats.error.message : 'Something went wrong.'}</div>
        )}
        {d && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={<Users size={16} />} label="Students" value={d.kpis.students} info="Students with at least one saved course" hint={`${d.kpis.activeSessions} signed in now`} />
              <Kpi icon={<BookOpen size={16} />} label="Courses" value={d.kpis.courses} info="Courses saved across all students" hint={`${nf.format(d.kpis.sections)} sections`} />
              <Kpi icon={<Search size={16} />} label="Searches" value={d.kpis.searchesThisWeek} info="ISMIS searches in the last 7 days"
                delta={delta(d.kpis.searchesThisWeek, d.kpis.searchesLastWeek)} hint="vs last week" />
              <Kpi icon={<FileCheck2 size={16} />} label="Consents" value={d.kpis.consentsThisWeek} info="Terms accepted in the last 7 days"
                delta={delta(d.kpis.consentsThisWeek, d.kpis.consentsLastWeek)} hint="vs last week" />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <SearchesChart data={d.searchesByMonth} />
              <RecentSearches rows={d.recent} />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
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

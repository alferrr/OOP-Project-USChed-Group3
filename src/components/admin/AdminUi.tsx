'use client'

import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Info, RefreshCw } from 'lucide-react'

export const SEMESTER_LABEL: Record<string, string> = { '1ST': '1st sem', '2ND': '2nd sem', SUMMER: 'Summer' }
export const nf = new Intl.NumberFormat('en-US')

export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

/** Top bar of every admin page: icon and title on the left, page actions on the right. */
export function PageHeader({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-green-100 bg-white px-6 py-4">
      <h1 className="flex items-center gap-2.5 text-lg font-semibold text-green-900">
        <span className="text-green-900" aria-hidden>{icon}</span>
        {title}
      </h1>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  )
}

/** "Last updated now" row with the page's own buttons on the right, as under the reference's top bar. */
export function Toolbar({ status, loading, onRefresh, children }: { status: string; loading: boolean; onRefresh: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-green-100 px-6 py-4">
      <p className="flex items-center gap-2 text-sm font-medium text-green-600" aria-live="polite">
        <Check size={16} aria-hidden /> {status}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onRefresh} disabled={loading} className="adm-btn">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden /> Refresh
        </button>
        {children}
      </div>
    </div>
  )
}

export function AdminCard({ title, children, action, className = '' }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`adm-card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-green-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Kpi({ icon, label, value, delta, hint, info }: {
  icon: ReactNode; label: string; value: number; delta?: { pct: number; up: boolean } | null; hint: string; info: string
}) {
  return (
    <div className="adm-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-green-900 text-white" aria-hidden>{icon}</span>
          <span className="text-sm font-medium text-green-900">{label}</span>
        </div>
        <span title={info} className="text-green-900/60"><Info size={18} aria-label={info} /></span>
      </div>
      <div className="mt-6 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold tracking-tight text-green-900">{nf.format(value)}</span>
          {delta && (
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${delta.up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {delta.up ? <ArrowUp size={11} aria-hidden /> : <ArrowDown size={11} aria-hidden />}{delta.pct}%
              <span className="sr-only">{delta.up ? 'up' : 'down'}</span>
            </span>
          )}
        </div>
        <span className="text-sm text-green-900/60">{hint}</span>
      </div>
    </div>
  )
}

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({ columns, rows, empty, loading }: { columns: Column<T>[]; rows: T[] | undefined; empty: string; loading: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-green-100 text-xs font-medium uppercase tracking-wide text-green-900/60">
            {columns.map((c) => <th key={c.header} scope="col" className={`px-4 py-3 ${c.className ?? ''}`}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-green-100">
          {(rows ?? []).map((r, i) => (
            <tr key={i} className="hover:bg-green-50/60">
              {columns.map((c) => <td key={c.header} className={`px-4 py-3 text-green-900 ${c.className ?? ''}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows && rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-green-900/60">{empty}</p>}
      {!rows && loading && <p className="px-4 py-8 text-center text-sm text-green-900/60">Loading…</p>}
    </div>
  )
}

export function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size))
  const from = total === 0 ? 0 : page * size + 1
  const to = Math.min(total, (page + 1) * size)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-green-100 px-4 py-3 text-sm text-green-900/70">
      <span>{nf.format(from)}–{nf.format(to)} of {nf.format(total)}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="adm-btn px-2" aria-label="Previous page" disabled={page <= 0} onClick={() => onPage(page - 1)}><ChevronLeft size={16} aria-hidden /></button>
        <span>Page {page + 1} of {pages}</span>
        <button type="button" className="adm-btn px-2" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}><ChevronRight size={16} aria-hidden /></button>
      </div>
    </div>
  )
}

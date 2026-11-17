'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { useAdminTable } from '../../api/hooks'
import { ago, DataTable, PageHeader, Pager, Toolbar, type Column } from './AdminUi'

interface Props<T> {
  icon: ReactNode
  title: string
  resource: string
  columns: Column<T>[]
  empty: string
  /** Shows a search box (courses only); the text is sent as ?q=. */
  searchable?: boolean
}

/** One bordered table card with paging, used by every list page of the admin console. */
export default function TablePage<T>({ icon, title, resource, columns, empty, searchable }: Props<T>) {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q); setPage(0) }, 250)
    return () => clearTimeout(t)
  }, [q])
  const table = useAdminTable<T>(resource, page, debounced)
  const d = table.data

  return (
    <div>
      <PageHeader icon={icon} title={title} />
      <Toolbar status={table.isError ? 'Could not load this table' : d ? `Last updated ${ago(new Date(table.dataUpdatedAt).toISOString())}` : 'Loading…'}
        loading={table.isFetching} onRefresh={() => table.refetch()}>
        {searchable && (
          <div className="relative w-56">
            <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-green-900/50" />
            <input type="search" aria-label={`Search ${title.toLowerCase()}`} placeholder="Search code or name" value={q}
              onChange={(e) => setQ(e.target.value)} className="adm-input" />
          </div>
        )}
      </Toolbar>
      <div className="p-6">
        {table.isError && <div role="alert" className="alert-error mb-4">{table.error instanceof Error ? table.error.message : 'Something went wrong.'}</div>}
        <section className="adm-card">
          <DataTable columns={columns} rows={d?.items} empty={empty} loading={table.isLoading} />
          {d && <Pager page={d.page} size={d.size} total={d.total} onPage={setPage} />}
        </section>
      </div>
    </div>
  )
}

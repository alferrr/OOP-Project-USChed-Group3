import { CheckCircle2, Circle, Loader2, MinusCircle, Plus, SearchX, XCircle } from 'lucide-react'
import type { CourseRef, ItemStatus, SearchItem, SearchStatus } from '../../api/types'
import { errorHelp } from '../../lib/errors'

function icon(status: ItemStatus) {
  switch (status) {
    case 'DONE': return <CheckCircle2 size={18} className="text-green-600" aria-hidden />
    case 'RUNNING': return <Loader2 size={18} className="animate-spin text-gold-600" aria-hidden />
    case 'NO_RESULTS': return <SearchX size={18} className="text-gold-600" aria-hidden />
    case 'TOO_MANY': return <MinusCircle size={18} className="text-gold-600" aria-hidden />
    case 'FAILED': return <XCircle size={18} className="text-red-600" aria-hidden />
    case 'SKIPPED': return <MinusCircle size={18} className="text-green-900/30" aria-hidden />
    default: return <Circle size={18} className="text-green-900/30" aria-hidden />
  }
}

function summary(item: SearchItem): string {
  switch (item.status) {
    case 'DONE': return `${item.courses} ${item.courses === 1 ? 'course' : 'courses'} · ${item.sections} sections`
    case 'RUNNING': return 'Searching ISMIS…'
    case 'PENDING': return 'Waiting'
    default: return item.message
  }
}

interface Props {
  status: SearchStatus
  selectedCount: number
  addedCourseIds: number[]
  /** Adds one suggested course to the current selection, already fetched into the catalog. */
  onAddSuggestion: (course: CourseRef) => void
}

/** One row per course code, updating as the server works through them one by one. */
export default function SearchProgress({ status, selectedCount, addedCourseIds, onAddSuggestion }: Props) {
  const failed = status.status === 'FAILED'
  return (
    <div className="rounded-lg border border-green-100 bg-white p-4" role="status" aria-live="polite">
      <ul className="space-y-2">
        {status.items.map((item) => (
          <li key={item.query} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5">{icon(item.status)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-green-900">
                {item.query}
                {item.searchedAs && (
                  <span className="ml-1.5 font-normal text-green-900/50">(searched as "{item.searchedAs}")</span>
                )}
              </p>
              <p className="break-words text-green-900/70">{summary(item)}</p>
              {item.suggestions.length > 0 && (
                <ul className="mt-2 space-y-1.5 rounded-md bg-gold-50 p-2">
                  {item.suggestions.map((c) => {
                    const added = addedCourseIds.includes(c.id)
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-green-900">
                          <strong>{c.code}</strong> {c.name} <span className="text-green-900/60">· {c.units}u</span>
                        </span>
                        <button onClick={() => onAddSuggestion(c)} disabled={added}
                          aria-label={`Add ${c.code}`}
                          className="flex shrink-0 items-center gap-1 rounded border border-green-700 px-2 py-0.5 text-xs font-medium text-green-800 hover:bg-white disabled:cursor-default disabled:border-green-200 disabled:text-green-900/40">
                          {added ? 'Added' : <><Plus size={12} aria-hidden /> Add</>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
      {failed && status.error && (
        <p role="alert" className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {errorHelp(status.error.code, status.error.message)}
        </p>
      )}
      {status.status === 'DONE' && (
        <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-900">
          Finished. {selectedCount} {selectedCount === 1 ? 'course is' : 'courses are'} in your selection.
        </p>
      )}
    </div>
  )
}

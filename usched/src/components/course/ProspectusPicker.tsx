import { useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { useProspectus } from '../../api/hooks'
import { ApiError } from '../../api/client'
import type { SemesterCode } from '../../api/types'
import { addCodes } from '../../lib/search'
import { errorHelp } from '../../lib/errors'

const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }
const SEMESTER_LABEL: Record<SemesterCode, string> = { '1ST': '1st Semester', '2ND': '2nd Semester', SUMMER: 'Summer' }
const SEMESTER_ORDER: SemesterCode[] = ['1ST', '2ND', 'SUMMER']

interface Props {
  /** The term currently being searched/built (the page's own semester selector). */
  semester: SemesterCode
  codes: string[]
  onAddCodes: (codes: string[]) => void
  disabled?: boolean
}

/**
 * Reads the student's own degree-program curriculum from ISMIS and lets them add a year level's subjects
 * straight into the search list, instead of typing each one. The curriculum spans every term (1st, 2nd,
 * Summer) across every year, so this picks its own term independently of the page's term selector — it
 * defaults to matching it, but a student can still browse any other term without leaving the panel.
 */
export default function ProspectusPicker({ semester, codes, onAddCodes, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const prospectus = useProspectus(open)
  const [yearLevel, setYearLevel] = useState<number | null>(null)
  // A term picked here only holds while the page's own term selector stays put; once that changes, follow it.
  const [pick, setPick] = useState<{ from: SemesterCode; value: SemesterCode } | null>(null)
  const pickerSemester = pick && pick.from === semester ? pick.value : semester
  const setPickerSemester = (value: SemesterCode) => setPick({ from: semester, value })

  const yearLevels = useMemo(
    () => [...new Set(prospectus.data?.courses.map((c) => c.yearLevel) ?? [])].sort((a, b) => a - b),
    [prospectus.data],
  )
  const termsForYear = useMemo(
    () =>
      SEMESTER_ORDER.filter((s) => prospectus.data?.courses.some((c) => c.yearLevel === yearLevel && c.semester === s)),
    [prospectus.data, yearLevel],
  )
  const matching = useMemo(
    () => prospectus.data?.courses.filter((c) => c.yearLevel === yearLevel && c.semester === pickerSemester) ?? [],
    [prospectus.data, yearLevel, pickerSemester],
  )
  const newCodes = matching.filter((c) => !codes.some((x) => x.toLowerCase() === c.code.toLowerCase()))
  const error = prospectus.error instanceof ApiError ? prospectus.error : null

  return (
    <div className={open ? 'rounded-2xl bg-green-50' : ''}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4 text-left font-bold text-green-800 transition-colors hover:bg-green-100">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <BookOpen size={16} className="text-gold-600" aria-hidden />
        Use my prospectus
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 pt-1 text-sm">
          {prospectus.isLoading && <p className="text-green-900/70" role="status">Reading your prospectus from ISMIS…</p>}
          {error && (
            <p role="alert" className="alert-error">
              {errorHelp(error.code, error.message)}
            </p>
          )}
          {prospectus.data && (
            <>
              <div role="group" aria-label="Year level" className="flex flex-wrap gap-2">
                {yearLevels.map((y) => (
                  <button key={y} onClick={() => setYearLevel(y)} aria-pressed={yearLevel === y}
                    className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${
                      yearLevel === y ? 'bg-green-700 text-white' : 'bg-white text-green-900 hover:bg-green-100'}`}>
                    {ORDINAL[y] ?? `${y}th`} year
                  </button>
                ))}
              </div>

              {yearLevel !== null && (
                termsForYear.length === 0 ? (
                  <p className="text-green-900/70">Nothing listed for this year level.</p>
                ) : (
                  <>
                    <div role="group" aria-label="Term" className="flex flex-wrap gap-2">
                      {termsForYear.map((s) => (
                        <button key={s} onClick={() => setPickerSemester(s)} aria-pressed={pickerSemester === s}
                          className={`rounded-full px-3.5 py-1 text-sm font-semibold transition-colors ${
                            pickerSemester === s ? 'bg-gold-400 text-green-900' : 'bg-white text-green-900/70 hover:bg-green-100'}`}>
                          {SEMESTER_LABEL[s]}
                        </button>
                      ))}
                    </div>
                    {pickerSemester !== semester && (
                      <p className="rounded-xl bg-gold-50 px-3 py-2 text-sm text-green-900">
                        You're currently searching <strong>{SEMESTER_LABEL[semester]}</strong>. These are{' '}
                        <strong>{SEMESTER_LABEL[pickerSemester]}</strong> subjects from your prospectus — ISMIS may not
                        have them listed as offered right now.
                      </p>
                    )}
                    {matching.length === 0 ? (
                      <p className="text-green-900/70">Nothing listed for this year and term.</p>
                    ) : (
                      <>
                        <ul className="space-y-3 rounded-2xl bg-white p-4">
                          {matching.map((c) => (
                            <li key={c.code} className="flex justify-between gap-2 text-green-900">
                              <span><strong>{c.code}</strong> {c.title}</span>
                              <span className="shrink-0 text-green-900/70">{c.units}u</span>
                            </li>
                          ))}
                        </ul>
                        <button onClick={() => onAddCodes(addCodes(codes, matching.map((c) => c.code)))}
                          disabled={disabled || newCodes.length === 0}
                          className="btn btn-primary">
                          {newCodes.length === 0 ? 'Already in your search list' : `Add ${newCodes.length} to the search list`}
                        </button>
                      </>
                    )}
                  </>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

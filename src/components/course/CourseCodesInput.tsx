import { X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { MAX_CODES, addCodes, parseCodes } from '../../lib/search'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

export interface CodeSuggestion { code: string; name: string }

interface Props {
  codes: string[]
  onChange: (codes: string[]) => void
  disabled?: boolean
  /** Matches for the debounced text, shown in a dropdown under the input. */
  suggestions?: CodeSuggestion[]
  /** Called with the typed text once the user pauses (debounced); use it to fetch `suggestions`. */
  onQuery?: (text: string) => void
}

const MIN_QUERY = 2
const DEBOUNCE_MS = 300

/** Type or paste several course codes; Enter, comma or a line break turns them into chips. */
export default function CourseCodesInput({ codes, onChange, disabled, suggestions = [], onQuery }: Props) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()

  const debounced = useDebouncedValue(text.trim(), DEBOUNCE_MS)
  useEffect(() => { onQuery?.(debounced.length >= MIN_QUERY ? debounced : '') }, [debounced, onQuery])

  const added = new Set(codes.map((c) => c.toLowerCase()))
  // Only offer suggestions for the text that was actually searched, and never ones already added.
  const options = text.trim() === debounced && debounced.length >= MIN_QUERY
    ? suggestions.filter((s) => !added.has(s.code.toLowerCase())).slice(0, 8)
    : []
  const showList = open && options.length > 0

  const pick = (s: CodeSuggestion) => {
    onChange(addCodes(codes, [s.code]))
    setText('')
    setActive(-1)
  }

  const commit = (raw: string) => {
    const parsed = parseCodes(raw)
    if (parsed.length > 0) onChange(addCodes(codes, parsed))
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showList && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + options.length) % options.length)
    } else if (e.key === 'Escape' && showList) {
      setOpen(false)
    } else if (e.key === 'Enter' && showList && options[active]) {
      e.preventDefault()
      pick(options[active])
    } else if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      commit(text)
    } else if (e.key === 'Backspace' && text === '' && codes.length > 0) {
      onChange(codes.slice(0, -1))
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (/[,;\n\r]/.test(pasted)) {
      e.preventDefault()
      commit(text + pasted)
    }
  }

  return (
    <div>
      <label htmlFor="course-codes" className="text-sm font-bold text-green-900">Course codes</label>
      <div className="relative">
      <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-green-200 bg-white p-2.5 transition-colors hover:border-green-300 focus-within:border-green-600">
        {codes.map((c) => (
          <span key={c} className="flex items-center gap-1 rounded-full bg-gold-400 px-3 py-1 text-sm font-bold text-green-900">
            {c}
            <button type="button" aria-label={`Remove ${c}`} disabled={disabled} onClick={() => onChange(codes.filter((x) => x !== c))}
              className="grid size-5 place-items-center rounded-full text-green-900/70 hover:bg-green-900/10 hover:text-green-900">
              <X size={14} />
            </button>
          </span>
        ))}
        <input id="course-codes" value={text} disabled={disabled || codes.length >= MAX_CODES}
          role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setText(e.target.value); setActive(-1); setOpen(true) }}
          onKeyDown={onKeyDown} onPaste={onPaste} onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); commit(text) }}
          placeholder={codes.length === 0 ? 'e.g. CIS 2105 or CIS' : 'Add another…'}
          className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-[0.9375rem] outline-none" autoComplete="off" spellCheck={false} />
      </div>
      {showList && (
        <div id={listId} role="listbox" aria-label="Course suggestions"
          className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[var(--shadow-lift)]">
          {options.map((s, i) => (
            <div key={s.code} id={`${listId}-${i}`} role="option" tabIndex={-1} aria-selected={i === active}
              // mousedown (not click) so the input keeps focus and its blur-commit doesn't swallow the pick
              onMouseDown={(e) => { e.preventDefault(); pick(s) }} onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors ${i === active ? 'bg-gold-100' : ''}`}>
              <span className="font-medium text-green-900">{s.code}</span>
              <span className="ml-2 text-green-900/70">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      </div>
      <p className="mt-2 text-sm text-green-900/70">
        A course code, a department like "CIS", or a description. Paste a list to add several (up to {MAX_CODES}).
      </p>
    </div>
  )
}

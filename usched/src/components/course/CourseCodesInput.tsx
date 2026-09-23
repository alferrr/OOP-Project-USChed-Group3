import { X } from 'lucide-react'
import { useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { MAX_CODES, addCodes, parseCodes } from '../../lib/search'

interface Props {
  codes: string[]
  onChange: (codes: string[]) => void
  disabled?: boolean
}

/** Type or paste several course codes; Enter, comma or a line break turns them into chips. */
export default function CourseCodesInput({ codes, onChange, disabled }: Props) {
  const [text, setText] = useState('')

  const commit = (raw: string) => {
    const parsed = parseCodes(raw)
    if (parsed.length > 0) onChange(addCodes(codes, parsed))
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
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
      <label htmlFor="course-codes" className="text-sm font-medium text-green-900">Course codes</label>
      <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-green-100 bg-white p-2 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-gold-300">
        {codes.map((c) => (
          <span key={c} className="flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-sm font-medium text-green-900">
            {c}
            <button type="button" aria-label={`Remove ${c}`} disabled={disabled} onClick={() => onChange(codes.filter((x) => x !== c))}
              className="text-green-800 hover:text-red-600">
              <X size={14} />
            </button>
          </span>
        ))}
        <input id="course-codes" value={text} disabled={disabled || codes.length >= MAX_CODES}
          onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} onPaste={onPaste} onBlur={() => commit(text)}
          placeholder={codes.length === 0 ? 'e.g. CIS 2105, or a department like CIS, then Enter' : 'Add another…'}
          className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none" autoComplete="off" spellCheck={false} />
      </div>
      <p className="mt-1 text-xs text-green-900/60">
        Enter a course code, a department code (e.g. "CIS"), or a description, one at a time or pasted as a list separated by commas or new lines. Up to {MAX_CODES}.
      </p>
    </div>
  )
}

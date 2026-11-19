'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

export const MAX_NAME = 60

interface Props {
  defaultName: string
  onSave: (name: string) => void
  onCancel: () => void
}

/** Asks for a name before a schedule is saved, so saved schedules are easy to tell apart later. */
export default function NameScheduleDialog({ defaultName, onSave, onCancel }: Props) {
  const [name, setName] = useState(defaultName)
  const input = useRef<HTMLInputElement>(null)
  const trimmed = name.trim()

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className="backdrop fixed inset-0 z-50 flex items-center justify-center bg-green-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <form role="dialog" aria-modal="true" aria-labelledby="name-schedule-title" onSubmit={submit}
        className="pop w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[var(--shadow-lift)]">
        <h2 id="name-schedule-title" className="text-xl font-extrabold text-green-900">Name this schedule</h2>
        <p className="mt-1 text-sm text-green-900/70">A name makes it easy to find among your saved schedules.</p>
        <label className="mt-4 block">
          <span className="text-sm font-semibold text-green-900">Schedule name</span>
          <input ref={input} value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Light Fridays" className="control mt-1.5" />
        </label>
        <div className="mt-1 text-right text-xs text-green-900/60">{name.length}/{MAX_NAME}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn btn-quiet">Cancel</button>
          <button type="submit" disabled={!trimmed} className="btn btn-primary">Save schedule</button>
        </div>
      </form>
    </div>
  )
}

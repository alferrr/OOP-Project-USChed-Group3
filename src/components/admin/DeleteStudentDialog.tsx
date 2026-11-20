'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { useDeleteStudent } from '../../api/hooks'
import type { DeletionReport } from '../../api/types'

/** Deleting a student's data cannot be undone, so the admin has to type the student ID number to confirm. */
export default function DeleteStudentDialog({ student, onClose }: { student: string; onClose: () => void }) {
  const del = useDeleteStudent()
  const [typed, setTyped] = useState('')
  const [report, setReport] = useState<DeletionReport | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !del.isPending) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, del.isPending])
  const err = del.error instanceof ApiError ? del.error.message : null

  return (
    <div className="backdrop fixed inset-0 z-50 flex items-center justify-center bg-green-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !del.isPending) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="pop w-full max-w-md rounded-xl bg-white p-6 shadow-[var(--shadow-lift)]">
        {report ? (
          <>
            <h2 id="delete-title" className="text-lg font-semibold text-green-900">Deleted</h2>
            <p role="status" className="mt-2 text-sm text-green-900/80">
              Removed {report.courses} courses, {report.sections} sections, {report.searches} searches, {report.savedSchedules} saved schedules
              and {report.tourRecords} tour {report.tourRecords === 1 ? 'record' : 'records'} for {student}.
              {report.endedSessions > 0 && ' They were also signed out.'} The deletion is in the audit log.
            </p>
            <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="adm-btn adm-btn-primary">Done</button></div>
          </>
        ) : (
          <>
            <h2 id="delete-title" className="text-lg font-semibold text-green-900">Delete all data for {student}?</h2>
            <p className="mt-2 text-sm text-green-900/80">
              This removes their saved courses, search log, saved schedules and tour record, and signs them out. It cannot be undone.
              The deletion itself is recorded in the audit log.
            </p>
            <label className="mt-4 block text-sm text-green-900">
              Type <strong className="tabular-nums">{student}</strong> to confirm
              <input ref={input} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-green-200 bg-white p-2.5 text-sm focus:border-red-600 focus:outline-none" />
            </label>
            {err && <p role="alert" className="alert-error mt-3">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={del.isPending} className="adm-btn">Cancel</button>
              <button type="button" disabled={typed.trim() !== student || del.isPending}
                onClick={() => del.mutate(student, { onSuccess: setReport })}
                className="adm-btn border-red-700 bg-red-700 text-white hover:!bg-red-800">{del.isPending ? 'Deleting…' : 'Delete everything'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import ConsentCheckboxes from './ConsentCheckboxes'
import TermsViewer from './TermsViewer'

interface Props {
  version: string
  text: string
  busy: boolean
  onAccept: () => void
  onCancel: () => void
}

/**
 * Terms & Conditions pop-up. Shown after every click on Login; both boxes start unticked and "Accept" stays
 * disabled until both are ticked. Escape or Cancel closes it without signing in.
 */
export default function TermsModal({ version, text, busy, onAccept, onCancel }: Props) {
  const [agreed, setAgreed] = useState({ agreedTerms: false, agreedCredentialUse: false })
  const dialog = useRef<HTMLDivElement>(null)
  const canAccept = agreed.agreedTerms && agreed.agreedCredentialUse && !busy

  useEffect(() => {
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-900/50 p-4 backdrop-blur-sm">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="terms-title" tabIndex={-1}
        className="rise flex max-h-[92vh] w-full max-w-2xl flex-col rounded-[2rem] bg-white shadow-[var(--shadow-lift)] outline-none">
        <div className="px-7 pb-2 pt-6">
          <h2 id="terms-title" className="text-2xl font-extrabold text-green-900">Terms &amp; Conditions</h2>
          <p className="mt-1 text-sm text-green-900/70">Please read and accept these before USChed signs in to ISMIS for you.</p>
        </div>

        <div className="space-y-5 overflow-y-auto px-7 py-4">
          <TermsViewer text={text} version={version} />
          <ConsentCheckboxes {...agreed} onChange={setAgreed} />
        </div>

        <div className="flex flex-wrap justify-end gap-3 px-7 pb-6 pt-3">
          <button type="button" onClick={onCancel} disabled={busy}
            className="btn btn-quiet">
            Cancel
          </button>
          <button type="button" onClick={onAccept} disabled={!canAccept}
            className="btn btn-primary">
            {busy ? 'Signing in…' : 'Accept and sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

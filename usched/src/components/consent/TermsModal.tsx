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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-900/60 p-4">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="terms-title" tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border-t-4 border-gold-400 bg-white shadow-2xl outline-none">
        <div className="border-b border-green-100 px-6 py-4">
          <h2 id="terms-title" className="text-xl font-bold text-green-800">Terms &amp; Conditions</h2>
          <p className="mt-1 text-sm text-green-900/70">Please read and accept these before USChed signs in to ISMIS for you.</p>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <TermsViewer text={text} version={version} />
          <ConsentCheckboxes {...agreed} onChange={setAgreed} />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-green-100 px-6 py-4">
          <button type="button" onClick={onCancel} disabled={busy}
            className="rounded-md px-4 py-2 text-sm text-green-800 hover:bg-green-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onAccept} disabled={!canAccept}
            className="rounded-md bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-700/30">
            {busy ? 'Signing in…' : 'Accept and sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

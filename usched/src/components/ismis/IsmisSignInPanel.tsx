import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useIsmisSignIn, useTerms } from '../../api/hooks'
import { ApiError } from '../../api/client'
import TermsModal from '../consent/TermsModal'
import { errorHelp } from '../../lib/errors'
import { useIsmisStore } from '../../store/ismisStore'

/**
 * Username and password, then Log In. Clicking Log In opens the Terms & Conditions pop-up; only after the student
 * accepts does anything leave the browser. Credentials live only in this component's state and are cleared as
 * soon as they are submitted (or the pop-up is cancelled).
 */
export default function IsmisSignInPanel() {
  const terms = useTerms()
  const signIn = useIsmisSignIn()
  const endedReason = useIsmisStore((s) => s.endedReason)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showTerms, setShowTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const canLogin = username !== '' && password !== '' && !!terms.data

  const login = (e: FormEvent) => {
    e.preventDefault()
    if (canLogin) {
      signIn.reset()
      setShowTerms(true)
    }
  }

  const accept = () => {
    if (!terms.data) return
    const u = username
    const p = password
    setUsername('')
    setPassword('')
    signIn.mutate({ termsVersion: terms.data.version, username: u, password: p }, {
      onSettled: () => setShowTerms(false),
    })
  }

  const cancel = () => {
    setPassword('') // never leave a password sitting in the form after backing out
    setShowTerms(false)
  }

  const error = signIn.error instanceof ApiError ? signIn.error : null
  const input = 'control'
  return (
    <>
      <form onSubmit={login} autoComplete="off" className="space-y-5">
        {endedReason && <p role="status" className="rounded-2xl bg-gold-50 px-4 py-3 text-sm text-green-900">{endedReason}</p>}
        {terms.isError && (
          <p role="alert" className="alert-error">
            Could not reach the USChed server. Is it running?
          </p>
        )}

        <label className="block">
          <span className="text-sm font-semibold text-green-900">Student ID or Username</span>
          <input className={`${input} mt-1.5`} aria-label="ISMIS username" placeholder="e.g. 19020241" value={username}
            onChange={(e) => setUsername(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-green-900">Password</span>
          <div className="relative mt-1.5">
            <input className={`${input} pr-10`} aria-label="ISMIS password" placeholder="••••••••"
              type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-3 flex items-center rounded-full px-1 text-green-900/65 hover:text-green-800">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && (
          <div role="alert" className="alert-error">
            <p>{errorHelp(error.code, error.message)}</p>
            {error.message && errorHelp(error.code, '') !== error.message && (
              <p className="mt-1 break-words text-xs text-red-900/80">Details: {error.message}</p>
            )}
          </div>
        )}

        <button type="submit" disabled={!canLogin}
          className="btn btn-primary w-full py-3.5">
          Log In
        </button>

        <p className="text-sm text-green-900/70">
          Use your ISMIS account. Your password is used once to sign in and then discarded. You will review the Terms
          &amp; Conditions next.
        </p>
      </form>

      {showTerms && terms.data && (
        <TermsModal version={terms.data.version} text={terms.data.text} busy={signIn.isPending}
          onAccept={accept} onCancel={cancel} />
      )}
    </>
  )
}

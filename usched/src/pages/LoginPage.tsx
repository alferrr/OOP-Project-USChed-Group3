import { Navigate, Link, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import IsmisSignInPanel from '../components/ismis/IsmisSignInPanel'
import { useIsmisStore } from '../store/ismisStore'

function Artwork() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-green-900 shadow-[var(--shadow-lift)]">
      <img src="/login.jpg" alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-green-900/50 via-transparent to-transparent" />
    </div>
  )
}

/**
 * The front door: a decorative panel and the sign-in form side by side, no header/footer chrome. The Terms &
 * Conditions pop-up appears after Log In; nothing else in the app is reachable until sign-in succeeds.
 */
export default function LoginPage() {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/courses'
  if (signedIn) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 p-5 lg:block">
        <Artwork />
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <span className="text-xl font-extrabold tracking-tight text-green-800">
            US<span className="text-green-500">Ched</span>
          </span>
          <Link to="/terms" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-green-900/70 transition-colors hover:bg-green-100 hover:text-green-800">
            <ShieldCheck size={16} aria-hidden /> Terms
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="surface rise w-full max-w-md p-7 sm:p-9">
            <h1 className="text-3xl font-extrabold tracking-tight text-green-900">
              Welcome to US<span className="text-green-500">Ched</span>
            </h1>
            <p className="mt-2 text-base text-green-900/70">Sign in with your ISMIS account to plan your next term.</p>
            <div className="mt-7">
              <IsmisSignInPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

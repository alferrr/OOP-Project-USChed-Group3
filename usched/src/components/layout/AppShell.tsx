import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, ListChecks, LogOut, ShieldCheck } from 'lucide-react'
import { useIsmisSignOut } from '../../api/hooks'
import { useIsmisStore } from '../../store/ismisStore'

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-full px-3 py-2.5 text-sm sm:px-4 sm:py-2 font-semibold transition-colors duration-200 ${
    isActive ? 'bg-green-700 text-white' : 'text-green-900/70 hover:bg-green-100 hover:text-green-900'
  }`

export default function AppShell() {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const idleMinutes = useIsmisStore((s) => s.idleMinutes)
  const signOut = useIsmisSignOut()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6 print:hidden">
        <div className="surface flex flex-wrap items-center justify-between gap-x-4 px-4 py-2 sm:px-5">
          <span className="font-display text-xl font-extrabold tracking-tight text-green-800">
            US<span className="text-green-500">Ched</span>
          </span>
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
            {signedIn && <span className="chip mr-2 hidden md:inline-flex">Signed in to ISMIS</span>}
            {signedIn && (
              <>
                <NavLink to="/courses" className={link}>
                  <ListChecks size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Courses</span>
                </NavLink>
                <NavLink to="/schedules" className={link}>
                  <CalendarDays size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Schedules</span>
                </NavLink>
              </>
            )}
            <NavLink to="/terms" className={link}>
              <ShieldCheck size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Terms</span>
            </NavLink>
            {signedIn && (
              <button
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                title={`Your ISMIS session ends after ${idleMinutes} minutes without activity, or when you sign out.`}
                className="ml-1 flex items-center gap-2 rounded-full px-3 py-2.5 text-sm sm:px-4 sm:py-2 font-semibold text-green-900/70 transition-colors duration-200 hover:bg-green-100 hover:text-green-900 disabled:opacity-50"
              >
                <LogOut size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        <Outlet />
      </main>

      <footer className="px-4 pb-6 pt-2 text-center text-xs text-green-900/70 print:hidden">
        USChed is an independent planner. It never enrolls, drops, or changes anything in ISMIS, so always enroll in the official ISMIS.
      </footer>
    </div>
  )
}

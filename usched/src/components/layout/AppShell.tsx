import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, ListChecks, LogOut, ShieldCheck } from 'lucide-react'
import { useIsmisSignOut } from '../../api/hooks'
import { useIsmisStore } from '../../store/ismisStore'

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-gold-400 text-green-900' : 'text-white/90 hover:bg-green-700'
  }`

export default function AppShell() {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const idleMinutes = useIsmisStore((s) => s.idleMinutes)
  const signOut = useIsmisSignOut()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b-4 border-gold-400 bg-green-800 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              U<span className="text-gold-300">SChed</span>
            </span>
            <span className="hidden text-xs text-white/70 sm:inline">schedule planner</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {signedIn && (
              <>
                <NavLink to="/courses" className={link}>
                  <ListChecks size={16} /> Courses
                </NavLink>
                <NavLink to="/schedules" className={link}>
                  <CalendarDays size={16} /> Schedules
                </NavLink>
              </>
            )}
            <NavLink to="/terms" className={link}>
              <ShieldCheck size={16} /> Terms
            </NavLink>
            {signedIn && (
              <button
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                title={`Your ISMIS session ends after ${idleMinutes} minutes without activity, or when you sign out.`}
                className="ml-2 flex items-center gap-2 rounded-md border border-gold-300 px-3 py-2 text-sm font-medium text-gold-100 hover:bg-green-700"
              >
                <LogOut size={16} /> Sign out
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>

      <footer className="border-t border-gold-300 bg-gold-50 px-4 py-3 text-center text-xs text-green-800 print:hidden">
        USChed plans schedules only. It never enrolls, drops, or changes anything in ISMIS. Always verify in the official ISMIS.
      </footer>
    </div>
  )
}

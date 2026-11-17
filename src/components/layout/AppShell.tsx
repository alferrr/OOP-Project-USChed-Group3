'use client'

import { useEffect, useState, type ReactNode } from 'react'
import NavLink from './NavLink'
import { CalendarDays, LayoutDashboard, ListChecks, LogOut, ShieldCheck } from 'lucide-react'
import { useIsmisSignOut } from '../../api/hooks'
import { useIsmisStore } from '../../store/ismisStore'

const linkBase = 'flex items-center gap-2 rounded-full px-3 py-2.5 text-sm sm:px-4 sm:py-2 font-semibold transition-colors duration-300'

// Two looks for the same nav: on the solid green bar (page top) and on the white floating pill (scrolled).
const linkClass = (scrolled: boolean) => ({ isActive }: { isActive: boolean }) =>
  `${linkBase} ${
    scrolled
      ? isActive ? 'bg-green-700 text-white' : 'text-green-900/70 hover:bg-green-100 hover:text-green-900'
      : isActive ? 'bg-white text-green-800' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

export default function AppShell({ children }: { children: ReactNode }) {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const isAdmin = useIsmisStore((s) => s.isAdmin)
  const idleMinutes = useIsmisStore((s) => s.idleMinutes)
  const signOut = useIsmisSignOut()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const link = linkClass(scrolled)

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={`sticky top-0 z-30 w-full transition-[background-color,padding] duration-300 motion-reduce:transition-none print:hidden ${
          scrolled ? 'bg-transparent px-4 pt-3 sm:px-6' : 'bg-green-800 px-4 pt-0 sm:px-6'
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 transition-[background-color,border-radius,box-shadow,padding] duration-300 motion-reduce:transition-none sm:px-5 ${
            scrolled
              ? 'rounded-[var(--radius-card)] bg-white py-2 shadow-[var(--shadow-card)]'
              : 'rounded-none bg-transparent py-3.5 shadow-none'
          }`}
        >
          <span className={`font-display text-xl font-extrabold tracking-tight transition-colors duration-300 ${scrolled ? 'text-green-800' : 'text-white'}`}>
            US<span className={scrolled ? 'text-green-500' : 'text-gold-300'}>Ched</span>
          </span>
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
            {signedIn && <span className="chip mr-2 hidden md:inline-flex">Signed in to ISMIS</span>}
            {signedIn && (
              <>
                <NavLink href="/courses" className={link}>
                  <ListChecks size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Courses</span>
                </NavLink>
                <NavLink href="/schedules" className={link}>
                  <CalendarDays size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Schedules</span>
                </NavLink>
              </>
            )}
            {signedIn && isAdmin && (
              <NavLink href="/admin" className={link}>
                <LayoutDashboard size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Admin</span>
              </NavLink>
            )}
            <NavLink href="/terms" className={link}>
              <ShieldCheck size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Terms</span>
            </NavLink>
            {signedIn && (
              <button
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
                title={`Your ISMIS session ends after ${idleMinutes} minutes without activity, or when you sign out.`}
                className={`${linkBase} ml-1 disabled:opacity-50 ${
                  scrolled ? 'text-green-900/70 hover:bg-green-100 hover:text-green-900' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <LogOut size={18} aria-hidden /> <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {children}
      </main>

      <footer className="px-4 pb-6 pt-2 text-center text-xs text-green-900/70 print:hidden">
        USChed is an independent planner. It never enrolls, drops, or changes anything in ISMIS, so always enroll in the official ISMIS.
      </footer>
    </div>
  )
}

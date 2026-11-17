'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, LayoutDashboard, ListChecks, LogOut, ShieldCheck } from 'lucide-react'
import { useAdminStats, useIsmisSignOut } from '../../api/hooks'
import { useIsmisStore } from '../../store/ismisStore'

const item = 'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors'

function SessionMeter({ used, max }: { used: number; max: number }) {
  const ticks = 32
  const lit = max > 0 ? Math.min(ticks, Math.round((used / max) * ticks)) : 0
  return (
    <div className="rounded-2xl bg-green-50 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-green-900">ISMIS sessions</span>
        <span className="text-xs font-semibold text-green-900/70">{max > 0 ? Math.round((used / max) * 100) : 0}%</span>
      </div>
      <p className="mt-0.5 text-xs text-green-900/70">{used} of {max} signed in</p>
      <div className="mt-3 flex h-4 items-end gap-[2px]" role="img" aria-label={`${used} of ${max} sessions in use`}>
        {Array.from({ length: ticks }, (_, i) => (
          <span key={i} className={`h-full flex-1 rounded-full ${i < lit ? 'bg-gold-400' : 'bg-green-200'}`} />
        ))}
      </div>
    </div>
  )
}

/**
 * The admin area's own chrome: a sidebar and a top bar instead of the student nav. Signed-out visitors are sent
 * to Login; a signed-in student who is not an admin sees a plain "no access" notice (the API refuses them too).
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const isAdmin = useIsmisStore((s) => s.isAdmin)
  const router = useRouter()
  const pathname = usePathname()
  const signOut = useIsmisSignOut()
  useEffect(() => {
    if (!signedIn) router.replace(`/login?from=${encodeURIComponent(pathname)}`)
  }, [signedIn, pathname, router])
  if (!signedIn) return null

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldCheck size={36} className="text-green-700" aria-hidden />
        <h1 className="text-2xl font-extrabold text-green-900">Admins only</h1>
        <p className="text-green-900/70">This account is not on the admin list.</p>
        <Link href="/courses" className="btn btn-primary">Back to USChed</Link>
      </main>
    )
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="hidden flex-col gap-6 border-r border-green-100 bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-2 pt-1">
          <span className="font-display text-xl font-extrabold tracking-tight text-green-800">US<span className="text-green-500">Ched</span></span>
          <p className="text-xs text-green-900/70">Admin console</p>
        </div>
        <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
          <Link href="/admin" aria-current="page" className={`${item} bg-green-50 text-green-900`}>
            <LayoutDashboard size={18} aria-hidden /> Dashboard
          </Link>
          <div className="my-3 border-t border-green-100" />
          <span className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-green-900/50">Student app</span>
          <Link href="/courses" className={`${item} text-green-900/70 hover:bg-green-50 hover:text-green-900`}>
            <ListChecks size={18} aria-hidden /> Courses
          </Link>
          <Link href="/schedules" className={`${item} text-green-900/70 hover:bg-green-50 hover:text-green-900`}>
            <CalendarDays size={18} aria-hidden /> Schedules
          </Link>
          <Link href="/terms" className={`${item} text-green-900/70 hover:bg-green-50 hover:text-green-900`}>
            <ShieldCheck size={18} aria-hidden /> Terms
          </Link>
        </nav>
        <AdminSessionMeter />
        <button onClick={() => signOut.mutate()} disabled={signOut.isPending}
          className={`${item} text-green-900/70 hover:bg-green-50 hover:text-green-900 disabled:opacity-50`}>
          <LogOut size={18} aria-hidden /> Sign out
        </button>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function AdminSessionMeter() {
  const stats = useAdminStats(true)
  if (!stats.data) return null
  return <SessionMeter used={stats.data.kpis.activeSessions} max={stats.data.kpis.maxSessions} />
}

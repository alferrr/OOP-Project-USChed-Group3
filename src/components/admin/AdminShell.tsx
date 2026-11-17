'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity, BookOpen, ChevronDown, ChevronRight, ChevronsLeft, ChevronsUpDown, CircleHelp, FileCheck2, GraduationCap, LayoutDashboard,
  LogOut, MonitorSmartphone, Search, ShieldCheck, Users,
} from 'lucide-react'
import { useAdminStats, useIsmisSignOut } from '../../api/hooks'
import { useIsmisStore } from '../../store/ismisStore'
import { nf } from './AdminUi'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/searches', label: 'Searches', icon: Search },
  { href: '/admin/consents', label: 'Consents', icon: FileCheck2 },
  { href: '/admin/sessions', label: 'Sessions', icon: MonitorSmartphone },
]

const row = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'

function SessionMeter({ used, max }: { used: number; max: number }) {
  const ticks = 40
  const lit = max > 0 ? Math.min(ticks, Math.round((used / max) * ticks)) : 0
  return (
    <div className="adm-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-green-900">ISMIS sessions</span>
        <span className="text-xs text-green-900/60">{max > 0 ? Math.round((used / max) * 100) : 0}%</span>
      </div>
      <p className="mt-1 text-xs text-green-900/60">{used} of {max} signed in</p>
      <div className="mt-3 flex h-4 items-stretch gap-px" role="img" aria-label={`${used} of ${max} sessions in use`}>
        {Array.from({ length: ticks }, (_, i) => (
          <span key={i} className={`flex-1 ${i < lit ? 'bg-gold-500' : 'bg-green-100'}`} />
        ))}
      </div>
    </div>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const signOut = useIsmisSignOut()
  const stats = useAdminStats(true)
  const [totalsOpen, setTotalsOpen] = useState(true)
  const k = stats.data?.kpis
  const totals = [
    { href: '/admin/courses', label: 'Courses', icon: BookOpen, value: k?.courses },
    { href: '/admin/students', label: 'Students', icon: Users, value: k?.students },
    { href: null, label: 'Instructors', icon: GraduationCap, value: k?.instructors },
  ]

  return (
    <aside className="hidden flex-col border-r border-green-100 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <span className="font-display text-lg font-bold leading-none tracking-tight text-green-900">US<span className="text-green-600">Ched</span></span>
          <p className="mt-1 text-xs text-green-900/60">Admin console</p>
        </div>
        <ChevronsLeft size={18} className="text-green-900/50" aria-hidden />
      </div>

      <div className="px-4">
        <div className="adm-card flex items-center justify-between px-3 py-2.5">
          <span className="flex items-center gap-2.5 text-sm font-medium text-green-900">
            <span className="flex size-6 items-center justify-center rounded-full bg-green-900 text-white" aria-hidden><ShieldCheck size={13} /></span>
            Administrator
          </span>
          <ChevronsUpDown size={15} className="text-green-900/50" aria-hidden />
        </div>
      </div>

      <nav aria-label="Admin" className="mt-4 flex-1 space-y-1 overflow-y-auto px-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`${row} relative ${active ? 'bg-green-50 text-green-900' : 'text-green-900/70 hover:bg-green-50 hover:text-green-900'}`}>
              {active && <span className="absolute -left-4 top-1.5 bottom-1.5 w-0.5 bg-green-700" aria-hidden />}
              <Icon size={18} aria-hidden /> {label}
            </Link>
          )
        })}
        <div className="my-3 border-t border-green-100" />
        <button type="button" onClick={() => setTotalsOpen(!totalsOpen)} aria-expanded={totalsOpen}
          className={`${row} w-full text-green-900/70 hover:bg-green-50`}>
          {totalsOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
          <span className="flex-1 text-left">Totals</span>
        </button>
        {totalsOpen && (
          <ul className="ml-3 space-y-0.5">
            {totals.map(({ href, label, icon: Icon, value }) => {
              const body = (
                <>
                  <Icon size={17} aria-hidden /> <span className="flex-1">{label}</span>
                  <span className="text-green-900/70">{value === undefined ? '–' : nf.format(value)}</span>
                </>
              )
              const cls = `${row} text-green-900/70`
              return (
                <li key={label}>
                  {href ? <Link href={href} className={`${cls} hover:bg-green-50 hover:text-green-900`}>{body}</Link> : <div className={cls}>{body}</div>}
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="space-y-3 px-4 pb-4 pt-3">
        {k && <SessionMeter used={k.activeSessions} max={k.maxSessions} />}
        <div className="border-t border-green-100 pt-2">
          <Link href="/courses" className={`${row} text-green-900/70 hover:bg-green-50 hover:text-green-900`}>
            <Activity size={18} aria-hidden /> <span className="flex-1">Student app</span> <ChevronRight size={16} aria-hidden />
          </Link>
          <Link href="/terms" className={`${row} text-green-900/70 hover:bg-green-50 hover:text-green-900`}>
            <CircleHelp size={18} aria-hidden /> <span className="flex-1">Terms</span> <ChevronRight size={16} aria-hidden />
          </Link>
          <button type="button" onClick={() => signOut.mutate()} disabled={signOut.isPending}
            className={`${row} w-full text-green-900/70 hover:bg-green-50 hover:text-green-900 disabled:opacity-50`}>
            <LogOut size={18} aria-hidden /> Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}

/** On narrow screens the sidebar is hidden, so the same pages are reachable from a scrolling strip. */
function MobileNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin pages" className="flex gap-1 overflow-x-auto border-b border-green-100 bg-white px-4 py-2 lg:hidden">
      {NAV.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${pathname === href ? 'bg-green-50 text-green-900' : 'text-green-900/70'}`}>
          {label}
        </Link>
      ))}
      <Link href="/courses" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-green-900/70">Student app</Link>
    </nav>
  )
}

/**
 * The admin area's own chrome: sidebar, flat white ground. Signed-out visitors are sent to Login; a signed-in
 * student who is not an admin sees a plain "no access" notice (the API refuses them too).
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const isAdmin = useIsmisStore((s) => s.isAdmin)
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (!signedIn) router.replace(`/login?from=${encodeURIComponent(pathname)}`)
  }, [signedIn, pathname, router])
  if (!signedIn) return null

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <ShieldCheck size={36} className="text-green-700" aria-hidden />
        <h1 className="text-2xl font-semibold text-green-900">Admins only</h1>
        <p className="text-green-900/70">This account is not on the admin list.</p>
        <Link href="/courses" className="adm-btn adm-btn-primary">Back to USChed</Link>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[17.5rem_1fr]">
      <Sidebar />
      <div className="min-w-0">
        <MobileNav />
        {children}
      </div>
    </div>
  )
}

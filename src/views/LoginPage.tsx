'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import AnnouncementBanner from '../components/announcement/AnnouncementBanner'
import IsmisSignInPanel from '../components/ismis/IsmisSignInPanel'
import BuildWeek from '../components/login/BuildWeek'
import { safeRedirectTarget } from '../lib/redirect'
import { useIsmisStore } from '../store/ismisStore'

/**
 * The front door: a decorative panel and the sign-in form side by side, no header/footer chrome. The Terms &
 * Conditions pop-up appears after Log In; nothing else in the app is reachable until sign-in succeeds.
 */
export default function LoginPage() {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const router = useRouter()
  const from = safeRedirectTarget(useSearchParams().get('from'))
  useEffect(() => {
    if (signedIn) router.replace(from)
  }, [signedIn, from, router])
  if (signedIn) return null

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner />
      <div className="flex flex-1">
      <div className="hidden w-1/2 p-5 lg:block">
        <BuildWeek />
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <span className="font-display text-xl font-extrabold tracking-tight text-green-800">
            US<span className="text-green-500">Ched</span>
          </span>
          <Link href="/terms" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-green-900/70 transition-colors hover:bg-green-100 hover:text-green-800">
            <ShieldCheck size={16} aria-hidden /> Terms
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="rise w-full max-w-md">
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-gold-700">Enrollment, planned</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-green-900">
              Plan the term before you enroll.
            </h1>
            <p className="mt-3 text-base text-green-900/70">
              Sign in with your ISMIS account. USChed finds the schedules that fit; you do the enrolling.
            </p>
            <div className="mt-7">
              <IsmisSignInPanel />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

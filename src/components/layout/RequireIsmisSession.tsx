'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIsmisStore } from '../../store/ismisStore'

/**
 * Every page except Login and Terms needs a signed-in ISMIS session; losing it sends the student back to Login
 * (remembering where they were going in ?from=). The session handle lives in memory only, so nothing is
 * rendered for a signed-out visitor, on the server or the client.
 */
export default function RequireIsmisSession({ children }: { children: ReactNode }) {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (!signedIn) router.replace(`/login?from=${encodeURIComponent(pathname)}`)
  }, [signedIn, pathname, router])
  return signedIn ? <>{children}</> : null
}

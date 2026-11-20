'use client'

import { useState } from 'react'
import { Info, TriangleAlert, X } from 'lucide-react'
import type { Announcement } from '../../api/types'
import { usePublicAnnouncement } from '../../api/hooks'

/** The look of the banner, used by the live one and by the admin's preview. */
export function BannerView({ message, tone, onClose }: { message: string; tone: 'info' | 'warning'; onClose?: () => void }) {
  const warn = tone === 'warning'
  return (
    <div role="status" className={`flex items-start gap-3 px-4 py-2.5 text-sm ${warn ? 'bg-gold-100 text-green-900' : 'bg-green-100 text-green-900'}`}>
      {warn ? <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold-700" aria-hidden /> : <Info size={16} className="mt-0.5 shrink-0 text-green-700" aria-hidden />}
      <p className="flex-1 whitespace-pre-wrap">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss announcement" className="rounded-full p-0.5 text-green-900/60 hover:bg-white/60 hover:text-green-900">
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  )
}

const keyOf = (a: Announcement) => `usched.announcement.dismissed.${a.updatedAt ?? ''}`

/** The admin's message, shown at the top of the app until the student dismisses it (a new message shows again). */
export default function AnnouncementBanner() {
  const { data } = usePublicAnnouncement()
  const [, bump] = useState(0)
  if (!data) return null
  let dismissed = false
  try { dismissed = window.sessionStorage.getItem(keyOf(data)) === '1' } catch { /* private mode: just show it */ }
  if (dismissed) return null
  const close = () => {
    try { window.sessionStorage.setItem(keyOf(data), '1') } catch { /* nothing to remember it in */ }
    bump((n) => n + 1)
  }
  return <div className="print:hidden"><BannerView message={data.message} tone={data.tone} onClose={close} /></div>
}

'use client'

import { useState } from 'react'
import type { Announcement } from '../../api/types'
import { usePublicAnnouncement } from '../../api/hooks'

/**
 * The look of the banner, used by the live one and by the admin's preview. Flat and loud on purpose: a solid band
 * with a short label, like a notice pinned over the timetable. Warnings borrow the gold of the 404's "no section"
 * block, with a hatched edge like a slot that is blocked out.
 */
export function BannerView({ message, tone, onClose }: { message: string; tone: 'info' | 'warning'; onClose?: () => void }) {
  const warn = tone === 'warning'
  return (
    <div role="status" className={`relative flex items-center gap-x-4 gap-y-1 py-2.5 pl-6 pr-4 sm:pl-8 sm:pr-6 ${warn ? 'bg-gold-400 text-green-900' : 'bg-green-900 text-white'}`}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-2.5"
        style={{ background: warn ? 'repeating-linear-gradient(135deg, #0a2f1d 0 3px, transparent 3px 7px)' : 'var(--color-gold-400)' }} />
      <span className={`shrink-0 font-display text-[0.7rem] font-extrabold uppercase tracking-[0.18em] ${warn ? 'text-green-900' : 'text-gold-300'}`}>
        {warn ? 'Heads up' : 'Notice'}
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-medium leading-snug">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss announcement"
          className={`shrink-0 text-sm font-semibold underline decoration-2 underline-offset-4 ${warn ? 'decoration-green-900/40 hover:decoration-green-900' : 'text-white/80 decoration-white/30 hover:text-white hover:decoration-gold-400'}`}>
          Got it
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

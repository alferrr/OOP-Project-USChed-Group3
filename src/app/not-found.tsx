import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass } from 'lucide-react'

export const metadata: Metadata = { title: 'Page not found' }

/** Shown for any address USChed does not have. Courses sends signed-out visitors on to the login page. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <span className="font-display text-xl font-extrabold tracking-tight text-green-800">
        US<span className="text-green-500">Ched</span>
      </span>
      <div className="surface mt-8 w-full max-w-md p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold-100 text-gold-700" aria-hidden>
          <Compass size={28} />
        </span>
        <p className="mt-5 font-display text-6xl font-extrabold tracking-tight text-green-800">404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-green-900">Page not found</h1>
        <p className="mt-2 text-green-900/70">
          That address doesn’t exist, or the page has moved. Head back and keep planning your schedule.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/courses" className="btn btn-primary">Go to Courses</Link>
          <Link href="/terms" className="btn btn-quiet">Read the Terms</Link>
        </div>
      </div>
    </main>
  )
}

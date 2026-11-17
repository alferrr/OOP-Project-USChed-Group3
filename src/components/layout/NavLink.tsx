'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** A Link that knows whether it points at the current page (and marks it aria-current, like a nav link should). */
export default function NavLink({
  href,
  className,
  children,
}: {
  href: string
  className: (state: { isActive: boolean }) => string
  children: ReactNode
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link href={href} className={className({ isActive })} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  )
}

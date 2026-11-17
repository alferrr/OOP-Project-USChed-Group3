import type { ReactNode } from 'react'

export default function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-3xl font-extrabold tracking-tight text-green-900 sm:text-4xl">{title}</h1>
      {children && <p className="mt-2 max-w-prose text-base text-green-900/70">{children}</p>}
    </div>
  )
}

import type { ReactNode } from 'react'

export default function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-green-800">{title}</h1>
      <div className="mt-1 h-1 w-16 rounded bg-gold-400" />
      {children && <p className="mt-3 max-w-prose text-sm text-green-900/70">{children}</p>}
    </div>
  )
}

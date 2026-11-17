import type { ReactNode } from 'react'
import RequireIsmisSession from '../../../components/layout/RequireIsmisSession'

export default function RequireSessionLayout({ children }: { children: ReactNode }) {
  return <RequireIsmisSession>{children}</RequireIsmisSession>
}

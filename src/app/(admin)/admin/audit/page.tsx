import type { Metadata } from 'next'
import { AdminAuditPage } from '../../../../views/admin/AdminTools'

export const metadata: Metadata = { title: 'Admin · Audit' }

export default function Page() {
  return <AdminAuditPage />
}

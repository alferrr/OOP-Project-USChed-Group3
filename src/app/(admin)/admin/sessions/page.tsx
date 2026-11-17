import type { Metadata } from 'next'
import { AdminSessionsPage } from '../../../../views/admin/AdminTables'

export const metadata: Metadata = { title: 'Admin · Sessions' }

export default function Page() {
  return <AdminSessionsPage />
}

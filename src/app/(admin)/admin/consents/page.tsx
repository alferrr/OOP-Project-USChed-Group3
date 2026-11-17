import type { Metadata } from 'next'
import { AdminConsentsPage } from '../../../../views/admin/AdminTables'

export const metadata: Metadata = { title: 'Admin · Consents' }

export default function Page() {
  return <AdminConsentsPage />
}

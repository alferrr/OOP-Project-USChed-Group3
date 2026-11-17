import type { Metadata } from 'next'
import { AdminSearchesPage } from '../../../../views/admin/AdminTables'

export const metadata: Metadata = { title: 'Admin · Searches' }

export default function Page() {
  return <AdminSearchesPage />
}

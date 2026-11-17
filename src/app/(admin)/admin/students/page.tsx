import type { Metadata } from 'next'
import { AdminStudentsPage } from '../../../../views/admin/AdminTables'

export const metadata: Metadata = { title: 'Admin · Students' }

export default function Page() {
  return <AdminStudentsPage />
}

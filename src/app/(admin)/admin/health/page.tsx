import type { Metadata } from 'next'
import { AdminHealthPage } from '../../../../views/admin/AdminTools'

export const metadata: Metadata = { title: 'Admin · Health' }

export default function Page() {
  return <AdminHealthPage />
}

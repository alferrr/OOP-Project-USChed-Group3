import type { Metadata } from 'next'
import { AdminImportPage } from '../../../../views/admin/AdminTools'

export const metadata: Metadata = { title: 'Admin · Import' }

export default function Page() {
  return <AdminImportPage />
}

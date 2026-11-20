import type { Metadata } from 'next'
import { AdminAdminsPage } from '../../../../views/admin/AdminTools'

export const metadata: Metadata = { title: 'Admin · Admins' }

export default function Page() {
  return <AdminAdminsPage />
}

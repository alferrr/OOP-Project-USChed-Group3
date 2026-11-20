import type { Metadata } from 'next'
import { AdminAnnouncementPage } from '../../../../views/admin/AdminTools'

export const metadata: Metadata = { title: 'Admin · Announcement' }

export default function Page() {
  return <AdminAnnouncementPage />
}

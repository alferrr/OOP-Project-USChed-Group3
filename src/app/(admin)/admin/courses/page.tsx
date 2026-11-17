import type { Metadata } from 'next'
import { AdminCoursesPage } from '../../../../views/admin/AdminTables'

export const metadata: Metadata = { title: 'Admin · Courses' }

export default function Page() {
  return <AdminCoursesPage />
}

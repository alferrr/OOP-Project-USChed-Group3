import type { Metadata } from 'next'
import { AdminInsightsPage } from '../../../../views/admin/AdminTools'

export const metadata: Metadata = { title: 'Admin · Insights' }

export default function Page() {
  return <AdminInsightsPage />
}

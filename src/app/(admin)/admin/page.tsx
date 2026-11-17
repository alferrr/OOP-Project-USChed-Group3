import type { Metadata } from 'next'
import AdminDashboard from '../../../views/AdminDashboard'

export const metadata: Metadata = { title: 'Admin' }

export default function AdminPage() {
  return <AdminDashboard />
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Unknown pages go to the course list (which itself sends signed-out visitors to the login page). */
export default function NotFound() {
  const router = useRouter()
  useEffect(() => router.replace('/courses'), [router])
  return null
}

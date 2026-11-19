import { noContent, route } from '@/server/http/api'
import { hasSeenTour, markTourSeen } from '@/server/services/tour'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Whether the signed-in student has already finished or skipped the first-sign-in tour. */
export const GET = route({ guard: 'student' }, async ({ studentIdNumber }) => ({ seen: await hasSeenTour(studentIdNumber) }))

export const PUT = route({ guard: 'student' }, async ({ studentIdNumber }) => {
  await markTourSeen(studentIdNumber)
  return noContent()
})

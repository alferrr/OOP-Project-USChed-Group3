import { route } from '@/server/http/api'
import { departments } from '@/server/services/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Scoped to the signed-in student: only departments that appear in their own catalog. */
export const GET = route({ guard: 'student' }, async ({ studentIdNumber }) => departments(studentIdNumber))

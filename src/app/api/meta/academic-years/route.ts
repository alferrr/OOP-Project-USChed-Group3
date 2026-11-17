import { route } from '@/server/http/api'
import { academicYears } from '@/server/services/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Scoped to the signed-in student: only years that appear in their own catalog. */
export const GET = route({ guard: 'student' }, async ({ studentIdNumber }) => academicYears(studentIdNumber))

import { SEMESTER_LABELS } from '@/server/http/dto'
import { route } from '@/server/http/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Deliberately not student-scoped: a fixed list (1st/2nd Sem, Summer), and the UI never sends a session for it.
export const GET = route({}, async () => SEMESTER_LABELS)

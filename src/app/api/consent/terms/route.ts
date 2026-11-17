import { route } from '@/server/http/api'
import { currentTerms } from '@/server/services/consent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({}, async () => currentTerms())

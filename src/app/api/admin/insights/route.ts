import { route } from '@/server/http/api'
import { usageInsights } from '@/server/services/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'adminSession' }, async () => usageInsights())

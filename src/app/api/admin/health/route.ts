import { route } from '@/server/http/api'
import { ismisHealth } from '@/server/services/ismisHealth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = route({ guard: 'adminSession' }, async () => ismisHealth())

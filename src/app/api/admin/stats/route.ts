import { route } from '@/server/http/api'
import { adminStats } from '@/server/services/adminStats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dashboard numbers. Only a signed-in ISMIS session whose ID number is on the admin list may read them. */
export const POST = route({ guard: 'adminSession' }, async () => adminStats())
export const GET = POST

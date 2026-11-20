import { route } from '@/server/http/api'
import { publicAnnouncement } from '@/server/services/announcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The message at the top of the app, if an admin has one switched on. Needs no sign-in: it is shown on the login page too. */
export const GET = route({}, async () => ({ announcement: await publicAnnouncement() }))

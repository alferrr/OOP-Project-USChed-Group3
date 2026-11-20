import { z } from 'zod'
import { body, route } from '@/server/http/api'
import { audit } from '@/server/services/adminAudit'
import { getAnnouncement, logAnnouncement, setAnnouncement } from '@/server/services/announcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const request = z.object({ message: z.string().max(280), tone: z.enum(['info', 'warning']), active: z.boolean() })

export const GET = route({ guard: 'adminSession' }, async () => getAnnouncement())

export const PUT = route({ guard: 'adminSession' }, async ({ req, studentIdNumber }) => {
  const b = await body(req, request)
  const saved = await setAnnouncement(b.message, b.tone, b.active)
  await logAnnouncement(studentIdNumber, b.message, b.tone, b.active)
  await audit(studentIdNumber, b.active ? 'ANNOUNCEMENT_ON' : 'ANNOUNCEMENT_OFF', '', b.message.trim().slice(0, 200))
  return saved
})

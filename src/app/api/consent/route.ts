import { body, clientIp, route } from '@/server/http/api'
import { consentRequest } from '@/server/http/dto'
import { recordConsent } from '@/server/services/consent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = route({}, async ({ req }) => {
  const b = await body(req, consentRequest)
  const grant = await recordConsent(b.termsVersion, b.agreedTerms, b.agreedCredentialUse, clientIp(req), req.headers.get('user-agent'))
  return { consentToken: grant.token, expiresAt: grant.expiresAt.toISOString() }
})

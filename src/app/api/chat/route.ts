import { z } from 'zod'
import { body, route } from '@/server/http/api'
import { MAX_CHARS, MAX_TURNS, streamReply } from '@/server/services/chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const chatRequest = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(MAX_CHARS) }))
    .min(1, { message: 'must not be empty' })
    .max(MAX_TURNS, { message: `size must be at most ${MAX_TURNS}` })
    .refine((m) => m[m.length - 1].role === 'user' && m[0].role === 'user', { message: 'must start and end with a user message' }),
  page: z.string().max(40).nullish(),
})

/** The in-app help assistant. Signed-in students only; the reply streams back as plain text. */
export const POST = route({ guard: 'student' }, async ({ req, studentIdNumber }) => {
  const b = await body(req, chatRequest)
  const stream = streamReply(studentIdNumber, b.messages, b.page)
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
})

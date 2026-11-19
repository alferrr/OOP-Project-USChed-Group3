import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from '../config'
import { ChatUnavailableError, RateLimitedError } from '../errors'
import { CHAT_SYSTEM_PROMPT, PAGE_NAMES } from '../chatPrompt'
import { singleton } from './singleton'

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

export const MAX_TURNS = 20
export const MAX_CHARS = 1000

/** Keeps each student to a fair number of questions per window, so the assistant cannot be run up. */
export class ChatRateLimiter {
  private readonly hits = new Map<string, number[]>()

  check(studentIdNumber: string, max: number, windowMs: number, now = Date.now()): void {
    const recent = (this.hits.get(studentIdNumber) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      this.hits.set(studentIdNumber, recent)
      throw new RateLimitedError('You have asked a lot of questions in a short time. Please wait a few minutes and try again.')
    }
    this.hits.set(studentIdNumber, [...recent, now])
  }
}

const limiter = () => singleton('chatRateLimiter', () => new ChatRateLimiter())

/** The student's page, as a one-line hint for the assistant. Only known pages are passed on. */
export function pageHint(path: string | null | undefined): string {
  const name = path ? PAGE_NAMES[path] : undefined
  return name ? `The student is currently on the "${name}" page.` : ''
}

/** Streams the assistant's reply as plain text chunks. Throws before streaming if the chat is off or the student is over their limit. */
export function streamReply(
  studentIdNumber: string,
  messages: ChatTurn[],
  path: string | null | undefined,
  client: Pick<Anthropic, 'beta'> = defaultClient(),
): ReadableStream<Uint8Array> {
  const cfg = getConfig().chat
  if (!cfg.enabled) throw new ChatUnavailableError()
  limiter().check(studentIdNumber, cfg.maxMessages, cfg.windowMinutes * 60_000)

  const hint = pageHint(path)
  const system = hint ? `${CHAT_SYSTEM_PROMPT}\n\n${hint}` : CHAT_SYSTEM_PROMPT
  // If a safety classifier declines the request, the API re-runs it on a fallback model instead of just stopping.
  const stream = client.beta.messages.stream({
    model: cfg.model,
    max_tokens: 1024,
    system,
    messages,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })

  const enc = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') controller.enqueue(enc.encode(event.delta.text))
        }
        const final = await stream.finalMessage()
        if (final.stop_reason === 'refusal') controller.enqueue(enc.encode('\n\nI can’t help with that one. Try asking about using USChed.'))
        else if (final.stop_reason === 'max_tokens') controller.enqueue(enc.encode('\n\n(That answer was cut short. Ask me to continue.)'))
      } catch {
        // Only the fact that it failed is sent on: error text from the provider is not for students.
        controller.enqueue(enc.encode('\n\nSorry, something went wrong on my side. Please try again.'))
      } finally {
        controller.close()
      }
    },
    cancel() {
      stream.abort()
    },
  })
}

function defaultClient(): Anthropic {
  return singleton('anthropicClient', () => new Anthropic())
}

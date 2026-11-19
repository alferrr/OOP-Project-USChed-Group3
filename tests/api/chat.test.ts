import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetConfigForTests } from '@/server/config'
import { CHAT_SYSTEM_PROMPT } from '@/server/chatPrompt'
import { ChatRateLimiter, pageHint, streamReply } from '@/server/services/chat'

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.UCHED_CHAT_MAX_MESSAGES
  resetConfigForTests()
  ;(globalThis as Record<string, unknown>).__usched_chatRateLimiter = undefined
})

function fakeClient(chunks: string[], stop_reason = 'end_turn') {
  const calls: unknown[] = []
  const client = {
    beta: {
      messages: {
        stream: (params: unknown) => {
          calls.push(params)
          return {
            async *[Symbol.asyncIterator]() {
              for (const text of chunks) yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
            },
            finalMessage: async () => ({ stop_reason }),
            abort: vi.fn(),
          }
        },
      },
    },
  }
  return { client: client as never, calls }
}

const read = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  const dec = new TextDecoder()
  let out = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return out
    out += dec.decode(value)
  }
}

describe('assistant', () => {
  it('is off without an API key', () => {
    resetConfigForTests()
    expect(() => streamReply('1', [{ role: 'user', content: 'hi' }], '/courses', fakeClient([]).client)).toThrow(/not available/i)
  })

  it('streams the reply, with the page as a hint and no student identity in the request', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    resetConfigForTests()
    const { client, calls } = fakeClient(['Open ', 'Preferences.'])
    const out = await read(streamReply('19020241', [{ role: 'user', content: 'How do I avoid a day?' }], '/courses', client))
    expect(out).toBe('Open Preferences.')
    const sent = JSON.stringify(calls[0])
    expect(sent).toContain('currently on the \\"Courses\\" page')
    expect(sent).not.toContain('19020241')
    expect(calls[0]).toMatchObject({ model: 'claude-opus-5-5', betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
  })

  it('says so when the model declines or is cut short', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    resetConfigForTests()
    expect(await read(streamReply('1', [{ role: 'user', content: 'x' }], null, fakeClient(['No.'], 'refusal').client))).toMatch(/can.t help with that/)
    expect(await read(streamReply('2', [{ role: 'user', content: 'x' }], null, fakeClient(['Long'], 'max_tokens').client))).toMatch(/cut short/)
  })

  it('limits how many questions one student can ask in the window, per student', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    process.env.UCHED_CHAT_MAX_MESSAGES = '2'
    resetConfigForTests()
    const { client } = fakeClient([])
    const ask = (id: string) => streamReply(id, [{ role: 'user', content: 'hi' }], null, client)
    ask('a'); ask('a')
    expect(() => ask('a')).toThrow(/wait a few minutes/i)
    expect(() => ask('b')).not.toThrow()
  })
})

describe('ChatRateLimiter', () => {
  it('forgets old questions once the window has passed', () => {
    const l = new ChatRateLimiter()
    l.check('a', 1, 1000, 0)
    expect(() => l.check('a', 1, 1000, 500)).toThrow()
    expect(() => l.check('a', 1, 1000, 1500)).not.toThrow()
  })
})

describe('pageHint and prompt', () => {
  it('only names pages the app has', () => {
    expect(pageHint('/saved')).toMatch(/Saved schedules/)
    expect(pageHint('/etc/passwd')).toBe('')
    expect(pageHint(null)).toBe('')
  })

  it('tells the assistant it cannot see the student’s data and must not take passwords', () => {
    expect(CHAT_SYSTEM_PROMPT).toMatch(/cannot see the student's courses/)
    expect(CHAT_SYSTEM_PROMPT).toMatch(/Never ask for a password/)
  })
})

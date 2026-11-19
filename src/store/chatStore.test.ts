import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { typingDelay, useChatStore } from './chatStore'

beforeEach(() => { vi.useFakeTimers(); useChatStore.getState().reset() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('typingDelay', () => {
  it('is a beat, a little longer for longer answers, never more than a second and a half', () => {
    expect(typingDelay('Short answer.')).toBeGreaterThanOrEqual(600)
    expect(typingDelay('word '.repeat(300))).toBe(1400)
    expect(typingDelay('word '.repeat(40))).toBeGreaterThan(typingDelay('word '.repeat(5)))
  })

  it('skips the pause for people who asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(typingDelay('anything at all')).toBe(0)
    useChatStore.getState().send('how do i save a schedule', null)
    expect(useChatStore.getState().messages).toHaveLength(2) // question and answer, immediately
    expect(useChatStore.getState().typing).toBe(false)
  })
})

describe('chat store', () => {
  it('adds the question first, then the answer after the pause', () => {
    useChatStore.getState().send('how do i save a schedule', null)
    expect(useChatStore.getState().messages.map((m) => m.role)).toEqual(['user'])
    expect(useChatStore.getState().typing).toBe(true)
    vi.advanceTimersByTime(1500)
    expect(useChatStore.getState().messages.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(useChatStore.getState().typing).toBe(false)
  })

  it('ignores blank questions', () => {
    useChatStore.getState().send('   ', null)
    expect(useChatStore.getState().messages).toEqual([])
  })
})

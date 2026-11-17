import { describe, expect, it } from 'vitest'
import { errorHelp } from './errors'

describe('errorHelp', () => {
  it('returns friendly text for known codes', () => {
    expect(errorHelp('ISMIS_AUTH_FAILED', 'raw')).toMatch(/username or password/)
  })
  it('falls back to the server message for unknown codes', () => {
    expect(errorHelp('SOMETHING_NEW', 'raw message')).toBe('raw message')
  })
})

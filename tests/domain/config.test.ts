// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEV_CONSENT_SECRET, DEV_IP_SALT, assertSecureDefaults, ismisConfigured, loadConfig } from '@/server/config'

describe('configuration defaults', () => {
  it('keeps safe, documented defaults', () => {
    const c = loadConfig({})
    expect(c.ismis.userAgent).toContain('USChed/1.0')
    expect(c.ismis.searchPath).toContain('/CourseSchedule/CourseScheduleOffered')
    expect(c.ismis.baseUrl).toBe('https://ismis.usc.edu.ph')
    expect(c.ismis.minDelayMs).toBeGreaterThan(0) // be polite to ISMIS by default
    expect(c.requireHttps).toBe(false)
    expect(c.admin.token).toBe('') // admin endpoints are off unless a token is set
    expect(c.termsVersion).toBe('2026-11-19-2')
    expect(ismisConfigured(c.ismis)).toBe(true)
  })

  it('reads overrides from the environment and ignores junk numbers', () => {
    const c = loadConfig({ UCHED_ISMIS_BASE_URL: 'http://fake', UCHED_SCRAPE_MAX_CONCURRENT: '5', UCHED_ISMIS_SESSION_MAX: 'lots' })
    expect(c.ismis.baseUrl).toBe('http://fake')
    expect(c.scrape.maxConcurrent).toBe(5)
    expect(c.ismisSession.maxSessions).toBe(100)
  })

  it('treats a blank ISMIS base URL as not configured', () => {
    expect(ismisConfigured(loadConfig({ UCHED_ISMIS_BASE_URL: '' }).ismis)).toBe(false)
  })
})

describe('assertSecureDefaults', () => {
  const secure = { UCHED_REQUIRE_HTTPS: 'true', UCHED_CONSENT_SECRET: 'a-real-secret-a-real-secret-a-real-secret', UCHED_IP_SALT: 'real-salt' }

  it('allows the dev defaults when HTTPS is not required (local development)', () => {
    expect(() => assertSecureDefaults(loadConfig({}))).not.toThrow()
  })

  it('rejects the dev secret in a deployed setup', () => {
    expect(() => assertSecureDefaults(loadConfig({ ...secure, UCHED_CONSENT_SECRET: DEV_CONSENT_SECRET }))).toThrow(/UCHED_CONSENT_SECRET/)
    expect(() => assertSecureDefaults(loadConfig({ UCHED_REQUIRE_HTTPS: 'true', UCHED_IP_SALT: 'real-salt' }))).toThrow(/UCHED_CONSENT_SECRET/)
  })

  it('rejects the dev salt in a deployed setup', () => {
    expect(() => assertSecureDefaults(loadConfig({ ...secure, UCHED_IP_SALT: DEV_IP_SALT }))).toThrow(/UCHED_IP_SALT/)
  })

  it('accepts real values', () => {
    expect(() => assertSecureDefaults(loadConfig(secure))).not.toThrow()
  })
})

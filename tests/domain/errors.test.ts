// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import * as E from '@/server/errors'
import { BadRequestError, toErrorResponse } from '@/server/http/api'

async function shape(e: unknown) {
  const res = toErrorResponse(e)
  return { status: res.status, body: await res.json(), cache: res.headers.get('cache-control') }
}

describe('error mapping', () => {
  it.each([
    [new E.ConsentRequiredError('m'), 403, 'CONSENT_REQUIRED'],
    [new E.ResourceNotFoundError('m'), 404, 'NOT_FOUND'],
    [new E.NoValidScheduleError('m', ['d']), 422, 'NO_VALID_SCHEDULE'],
    [new E.RateLimitedError('m'), 429, 'SCRAPE_RATE_LIMITED'],
    [new E.IsmisSessionExpiredError('m'), 401, 'ISMIS_SESSION_EXPIRED'],
    [new E.IsmisAuthenticationError('m'), 401, 'ISMIS_AUTH_FAILED'],
    [new E.IsmisChallengeError('m'), 422, 'ISMIS_CHALLENGE_REQUIRED'],
    [new E.IsmisLayoutChangedError('m'), 502, 'ISMIS_LAYOUT_CHANGED'],
    [new E.IsmisNoResultsError('m'), 404, 'ISMIS_NO_RESULTS'],
    [new E.IsmisTooManyResultsError('m'), 422, 'ISMIS_TOO_MANY_RESULTS'],
    [new E.IsmisNotConfiguredError('m'), 503, 'ISMIS_NOT_CONFIGURED'],
    [new E.IsmisUnavailableError('m'), 502, 'ISMIS_UNAVAILABLE'],
    [new E.ScraperError('m'), 502, 'ISMIS_UNAVAILABLE'],
    [new E.DataSourceError('m'), 502, 'DATA_SOURCE_ERROR'],
    [new E.InvalidCourseDataError('m'), 400, 'INVALID_DATA'],
    [new E.InvalidTimeRangeError('m'), 400, 'INVALID_DATA'],
    [new E.MissingScheduleInfoError('m'), 400, 'INVALID_DATA'],
    [new BadRequestError(), 400, 'BAD_REQUEST'],
    [new SyntaxError('Unexpected token'), 400, 'BAD_REQUEST'],
    [new ZodError([]), 400, 'VALIDATION_ERROR'],
  ])('%o -> %i %s', async (err, status, code) => {
    const r = await shape(err)
    expect(r.status).toBe(status)
    expect(r.body.code).toBe(code)
    expect(r.cache).toBe('no-store')
  })

  it('shows messages for 4xx and 502 but a generic one for other 5xx', async () => {
    expect((await shape(new E.IsmisUnavailableError('ISMIS is down'))).body.message).toBe('ISMIS is down')
    expect((await shape(new E.IsmisNotConfiguredError('internal detail'))).body.message).toBe('Something went wrong.')
  })

  it('carries the explanation of an impossible schedule', async () => {
    expect((await shape(new E.NoValidScheduleError('m', ['A conflicts with B']))).body.details).toEqual(['A conflicts with B'])
  })

  it('never leaks what an unexpected error said', async () => {
    const r = await shape(new Error('password=hunter2 in the stack'))
    expect(r.status).toBe(500)
    expect(JSON.stringify(r.body)).not.toContain('hunter2')
    expect(r.body.code).toBe('INTERNAL_ERROR')
  })
})

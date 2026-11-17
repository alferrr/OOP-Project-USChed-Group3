/**
 * Every expected failure is a subclass of USChedError that carries its own HTTP status and API code, so the
 * mapping lives next to the exception instead of in a long if-chain.
 */
export class USChedError extends Error {
  readonly status: number = 500
  readonly code: string = 'INTERNAL_ERROR'

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class ConsentRequiredError extends USChedError {
  readonly status = 403
  readonly code = 'CONSENT_REQUIRED'
}

export class ResourceNotFoundError extends USChedError {
  readonly status = 404
  readonly code = 'NOT_FOUND'
}

export class NoValidScheduleError extends USChedError {
  readonly status = 422
  readonly code = 'NO_VALID_SCHEDULE'
  readonly details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    this.details = details
  }
}

export class RateLimitedError extends USChedError {
  readonly status = 429
  readonly code = 'SCRAPE_RATE_LIMITED'
}

export class IsmisSessionExpiredError extends USChedError {
  readonly status = 401
  readonly code = 'ISMIS_SESSION_EXPIRED'
}

export class IsmisAuthenticationError extends USChedError {
  readonly status = 401
  readonly code = 'ISMIS_AUTH_FAILED'
}

export class IsmisChallengeError extends USChedError {
  readonly status = 422
  readonly code = 'ISMIS_CHALLENGE_REQUIRED'
}

export class IsmisLayoutChangedError extends USChedError {
  readonly status = 502
  readonly code = 'ISMIS_LAYOUT_CHANGED'
}

export class IsmisNoResultsError extends USChedError {
  readonly status = 404
  readonly code = 'ISMIS_NO_RESULTS'
}

export class IsmisTooManyResultsError extends USChedError {
  readonly status = 422
  readonly code = 'ISMIS_TOO_MANY_RESULTS'
}

export class IsmisNotConfiguredError extends USChedError {
  readonly status = 503
  readonly code = 'ISMIS_NOT_CONFIGURED'
}

export class IsmisUnavailableError extends USChedError {
  readonly status = 502
  readonly code = 'ISMIS_UNAVAILABLE'
}

/** The scraper refused something outside its read-only rules (blocked host/path/method). */
export class ScraperError extends USChedError {
  readonly status = 502
  readonly code = 'ISMIS_UNAVAILABLE'
}

export class DataSourceError extends USChedError {
  readonly status = 502
  readonly code = 'DATA_SOURCE_ERROR'
}

export class InvalidCourseDataError extends USChedError {
  readonly status = 400
  readonly code = 'INVALID_DATA'
}

export class InvalidTimeRangeError extends InvalidCourseDataError {}

export class MissingScheduleInfoError extends InvalidCourseDataError {}

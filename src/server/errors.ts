const KINDS = Symbol.for('usched.error.kinds')

/**
 * Every expected failure is a subclass of USChedError that carries its own HTTP status and API code, so the
 * mapping lives next to the exception instead of in a long if-chain.
 *
 * `instanceof` is answered by each class's stable `kind` rather than by class identity. Next.js can bundle
 * route handlers into separate module graphs (and dev hot reload re-evaluates modules), so one process may hold
 * two copies of these classes: a service pinned on globalThis throws copy A while a route checks copy B. With
 * plain identity checks that error would fall through to a 500.
 */
export class USChedError extends Error {
  static readonly kind: string = 'USChedError'
  readonly status: number = 500
  readonly code: string = 'INTERNAL_ERROR'

  constructor(message: string) {
    super(message)
    this.name = new.target.name
    const kinds: string[] = []
    for (let c: unknown = new.target; typeof c === 'function' && c !== Error; c = Object.getPrototypeOf(c)) {
      const k = Object.getOwnPropertyDescriptor(c, 'kind')?.value
      if (typeof k === 'string') kinds.push(k)
    }
    Object.defineProperty(this, KINDS, { value: kinds, enumerable: false })
  }

  static [Symbol.hasInstance](value: unknown): boolean {
    const kinds = typeof value === 'object' && value !== null ? (value as { [KINDS]?: string[] })[KINDS] : undefined
    return Array.isArray(kinds) && kinds.includes(this.kind)
  }
}

export class ConsentRequiredError extends USChedError {
  static readonly kind: string = 'ConsentRequiredError'
  readonly status = 403
  readonly code = 'CONSENT_REQUIRED'
}

export class AdminForbiddenError extends USChedError {
  static readonly kind: string = 'AdminForbiddenError'
  readonly status = 403
  readonly code = 'ADMIN_FORBIDDEN'

  constructor(message = 'This account is not allowed to open the admin dashboard.') {
    super(message)
  }
}

export class ResourceNotFoundError extends USChedError {
  static readonly kind: string = 'ResourceNotFoundError'
  readonly status = 404
  readonly code = 'NOT_FOUND'
}

export class NoValidScheduleError extends USChedError {
  static readonly kind: string = 'NoValidScheduleError'
  readonly status = 422
  readonly code = 'NO_VALID_SCHEDULE'
  readonly details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    this.details = details
  }
}

export class RateLimitedError extends USChedError {
  static readonly kind: string = 'RateLimitedError'
  readonly status = 429
  readonly code = 'SCRAPE_RATE_LIMITED'
}

export class IsmisSessionExpiredError extends USChedError {
  static readonly kind: string = 'IsmisSessionExpiredError'
  readonly status = 401
  readonly code = 'ISMIS_SESSION_EXPIRED'
}

export class IsmisAuthenticationError extends USChedError {
  static readonly kind: string = 'IsmisAuthenticationError'
  readonly status = 401
  readonly code = 'ISMIS_AUTH_FAILED'
}

export class IsmisChallengeError extends USChedError {
  static readonly kind: string = 'IsmisChallengeError'
  readonly status = 422
  readonly code = 'ISMIS_CHALLENGE_REQUIRED'
}

export class IsmisLayoutChangedError extends USChedError {
  static readonly kind: string = 'IsmisLayoutChangedError'
  readonly status = 502
  readonly code = 'ISMIS_LAYOUT_CHANGED'
}

export class IsmisNoResultsError extends USChedError {
  static readonly kind: string = 'IsmisNoResultsError'
  readonly status = 404
  readonly code = 'ISMIS_NO_RESULTS'
}

export class IsmisTooManyResultsError extends USChedError {
  static readonly kind: string = 'IsmisTooManyResultsError'
  readonly status = 422
  readonly code = 'ISMIS_TOO_MANY_RESULTS'
}

export class IsmisNotConfiguredError extends USChedError {
  static readonly kind: string = 'IsmisNotConfiguredError'
  readonly status = 503
  readonly code = 'ISMIS_NOT_CONFIGURED'
}

export class IsmisUnavailableError extends USChedError {
  static readonly kind: string = 'IsmisUnavailableError'
  readonly status = 502
  readonly code = 'ISMIS_UNAVAILABLE'
}

/** The scraper refused something outside its read-only rules (blocked host/path/method). */
export class ScraperError extends USChedError {
  static readonly kind: string = 'ScraperError'
  readonly status = 502
  readonly code = 'ISMIS_UNAVAILABLE'
}

export class DataSourceError extends USChedError {
  static readonly kind: string = 'DataSourceError'
  readonly status = 502
  readonly code = 'DATA_SOURCE_ERROR'
}

export class InvalidCourseDataError extends USChedError {
  static readonly kind: string = 'InvalidCourseDataError'
  readonly status = 400
  readonly code = 'INVALID_DATA'
}

export class InvalidTimeRangeError extends InvalidCourseDataError {
  static readonly kind: string = 'InvalidTimeRangeError'
}

export class MissingScheduleInfoError extends InvalidCourseDataError {
  static readonly kind: string = 'MissingScheduleInfoError'
}

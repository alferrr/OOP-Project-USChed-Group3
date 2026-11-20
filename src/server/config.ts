/**
 * All server configuration comes from environment variables (see .env.example). Read lazily through
 * getConfig() so tests can change process.env between cases and `next build` never needs production secrets.
 */
export const DEV_CONSENT_SECRET = 'dev-only-change-me-dev-only-change-me'
export const DEV_IP_SALT = 'dev-only-salt'

export interface IsmisConfig {
  baseUrl: string
  loginPath: string
  logoutPath: string
  usernameField: string
  passwordField: string
  /** GET page that contains the term search form. */
  offeredCoursesPath: string
  /** GET page listing the student's own degree program curriculum, by year level and semester. */
  prospectusPath: string
  /** The only path (besides login) that may receive a POST: the read-only term search. */
  searchPath: string
  searchFormSelector: string
  academicPeriodField: string
  academicYearField: string
  coursesField: string
  /** The offered-courses table has no units column; new courses get this until real units are known. */
  defaultUnits: number
  defaultCampus: string
  userAgent: string
  minDelayMs: number
  requestTimeoutSeconds: number
  maxPages: number
  /** Extra read-only GET path prefixes (e.g. result pagination links). */
  allowedPathPrefixes: string[]
}

export interface AppConfig {
  termsVersion: string
  requireHttps: boolean
  consent: { secret: string; ttlMinutes: number; ipSalt: string }
  catalog: { ttlHours: number }
  scrape: { maxConcurrent: number; timeoutSeconds: number }
  generation: { cap: number; defaultLimit: number }
  admin: { token: string; studentIds: string[] }
  ismisSession: { idleMinutes: number; maxMinutes: number; maxSessions: number }
  ismis: IsmisConfig
}

type Env = Record<string, string | undefined>

const str = (env: Env, key: string, fallback: string) => env[key] ?? fallback
const num = (env: Env, key: string, fallback: number) => {
  const v = env[key]
  if (v === undefined || v.trim() === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function loadConfig(env: Env = process.env): AppConfig {
  return {
    termsVersion: str(env, 'UCHED_TERMS_VERSION', '2026-11-20-2'),
    requireHttps: str(env, 'UCHED_REQUIRE_HTTPS', 'false').toLowerCase() === 'true',
    consent: {
      secret: str(env, 'UCHED_CONSENT_SECRET', DEV_CONSENT_SECRET),
      ttlMinutes: num(env, 'UCHED_CONSENT_TTL_MINUTES', 60),
      ipSalt: str(env, 'UCHED_IP_SALT', DEV_IP_SALT),
    },
    catalog: { ttlHours: num(env, 'UCHED_CATALOG_TTL_HOURS', 24) },
    scrape: {
      maxConcurrent: num(env, 'UCHED_SCRAPE_MAX_CONCURRENT', 2),
      timeoutSeconds: num(env, 'UCHED_SCRAPE_TIMEOUT_SECONDS', 180),
    },
    generation: { cap: num(env, 'UCHED_GENERATION_CAP', 500), defaultLimit: num(env, 'UCHED_GENERATION_DEFAULT_LIMIT', 20) },
    // A blank token disables /api/admin/**.
    admin: {
      token: str(env, 'UCHED_ADMIN_TOKEN', ''),
      // student ID numbers that may open the admin dashboard once signed in (comma-separated).
      studentIds: str(env, 'UCHED_ADMIN_IDS', '19020241').split(',').map((s) => s.trim()).filter(Boolean),
    },
    ismisSession: {
      idleMinutes: num(env, 'UCHED_ISMIS_SESSION_IDLE_MINUTES', 20),
      maxMinutes: num(env, 'UCHED_ISMIS_SESSION_MAX_MINUTES', 60),
      maxSessions: num(env, 'UCHED_ISMIS_SESSION_MAX', 100),
    },
    // Values come from the recon of ISMIS's sign-in page and its "Course Schedule Offered" page.
    ismis: {
      baseUrl: str(env, 'UCHED_ISMIS_BASE_URL', 'https://ismis.usc.edu.ph'),
      loginPath: str(env, 'UCHED_ISMIS_LOGIN_PATH', '/Account/Login'),
      logoutPath: str(env, 'UCHED_ISMIS_LOGOUT_PATH', ''),
      usernameField: str(env, 'UCHED_ISMIS_USERNAME_FIELD', 'Username'),
      passwordField: str(env, 'UCHED_ISMIS_PASSWORD_FIELD', 'Password'),
      offeredCoursesPath: str(env, 'UCHED_ISMIS_OFFERED_PATH', '/courseschedule/CourseScheduleOfferedIndex'),
      prospectusPath: str(env, 'UCHED_ISMIS_PROSPECTUS_PATH', '/prospectus/StudentProspectus'),
      searchPath: str(env, 'UCHED_ISMIS_SEARCH_PATH', '/CourseSchedule/CourseScheduleOffered'),
      searchFormSelector: 'form#CourseScheduleCourseScheduleOffered',
      academicPeriodField: 'AcademicPeriod',
      academicYearField: 'AcademicYear',
      coursesField: 'Courses',
      defaultUnits: 3.0,
      defaultCampus: 'Main',
      userAgent: str(
        env,
        'UCHED_ISMIS_USER_AGENT',
        'USChed/1.0 (student schedule planner; contact: set-UCHED_ISMIS_USER_AGENT)',
      ),
      minDelayMs: num(env, 'UCHED_ISMIS_MIN_DELAY_MS', 500),
      requestTimeoutSeconds: num(env, 'UCHED_ISMIS_TIMEOUT_SECONDS', 20),
      maxPages: num(env, 'UCHED_ISMIS_MAX_PAGES', 50),
      allowedPathPrefixes: ['/CourseSchedule/OfferedCoursesFilter'],
    },
  }
}

let cached: AppConfig | undefined

export function getConfig(): AppConfig {
  return (cached ??= loadConfig())
}

/** Tests only: drop the cached config so the next getConfig() re-reads process.env. */
export function resetConfigForTests() {
  cached = undefined
}

export function isAdminStudent(studentIdNumber: string): boolean {
  return getConfig().admin.studentIds.includes(studentIdNumber)
}

export function ismisConfigured(c: IsmisConfig): boolean {
  return [c.baseUrl, c.loginPath, c.offeredCoursesPath, c.searchPath, c.usernameField, c.passwordField].every(
    (v) => !!v && v.trim() !== '',
  )
}

/**
 * Refuses to start in a deployed setup (UCHED_REQUIRE_HTTPS on) while the consent HMAC key or IP salt is still
 * the publicly known development default - anyone could forge consent tokens and reverse the salted IP hashes.
 */
export function assertSecureDefaults(c: AppConfig = getConfig()) {
  if (!c.requireHttps) return
  if (c.consent.secret === DEV_CONSENT_SECRET) {
    throw new Error('UCHED_CONSENT_SECRET must be set when UCHED_REQUIRE_HTTPS is on')
  }
  if (c.consent.ipSalt === DEV_IP_SALT) {
    throw new Error('UCHED_IP_SALT must be set when UCHED_REQUIRE_HTTPS is on')
  }
}

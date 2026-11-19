/** Friendly text for the API's error codes; the server's own message is still shown as "Details". */
const HELP: Record<string, string> = {
  ISMIS_AUTH_FAILED: 'ISMIS did not accept that username or password. Check them and try again.',
  ISMIS_SESSION_EXPIRED: 'Your ISMIS session ended. Please sign in again.',
  ISMIS_CHALLENGE_REQUIRED:
    'ISMIS asked for a CAPTCHA or verification code. USChed cannot complete that step, so it cannot sign in for you right now.',
  ISMIS_LAYOUT_CHANGED: 'ISMIS looks different from what USChed expects, so nothing was imported.',
  ISMIS_NO_RESULTS:
    'ISMIS has no offered courses matching that search for the selected term. Check the spelling, or the semester and academic year.',
  ISMIS_TOO_MANY_RESULTS: 'That search matched too many results. Use a more specific course code, for example "CIS 2105".',
  ISMIS_NOT_CONFIGURED:
    'Live ISMIS access is not set up on this server yet. Ask the developer to finish the ISMIS setup, or import a CSV.',
  ISMIS_UNAVAILABLE: 'ISMIS could not be reached right now. Try again later.',
  SCRAPE_RATE_LIMITED: 'A search is already running, or USChed is busy with other students. Try again in a moment.',
  CONSENT_REQUIRED: 'Please review the Terms and accept them to continue.',
  NETWORK: 'Could not reach the USChed server.',
}

export function errorHelp(code: string, fallback: string): string {
  return HELP[code] ?? fallback
}

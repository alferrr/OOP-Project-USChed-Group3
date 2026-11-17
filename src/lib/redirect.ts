/** Only same-site paths: "?from=" is user-controlled, so never send the browser to another origin. */
export function safeRedirectTarget(from: string | null): string {
  return from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') ? from : '/courses'
}

/**
 * Runs once when the Node server starts. Fails fast on insecure deployments (production secrets still at their
 * public development defaults) instead of discovering it on the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertSecureDefaults } = await import('./server/config')
    assertSecureDefaults()
  }
}

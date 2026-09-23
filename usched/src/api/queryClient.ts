import { QueryClient } from '@tanstack/react-query'

/** One shared instance so non-hook code (api/client.ts) can clear it on sign-out/session-expiry too. */
export const queryClient = new QueryClient()

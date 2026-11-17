import { vi } from 'vitest'

/**
 * A stand-in for next/navigation in unit tests (installed globally in setup.ts). Tests read the `router`
 * spies and set `nav.pathname` / `nav.search` to simulate where the browser is.
 */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

export const nav = { pathname: '/', search: new URLSearchParams() }

export function resetNavigation() {
  Object.values(router).forEach((fn) => fn.mockClear())
  nav.pathname = '/'
  nav.search = new URLSearchParams()
}

export const useRouter = () => router
export const usePathname = () => nav.pathname
export const useSearchParams = () => nav.search
export const redirect = vi.fn()

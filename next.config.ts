import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a second server (tests, CI) build into its own folder instead of fighting a running `next dev` over .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Prisma ships a native query engine and cheerio is server-only; keep both out of the bundle.
  serverExternalPackages: ['@prisma/client', 'prisma', 'cheerio'],
}

export default config

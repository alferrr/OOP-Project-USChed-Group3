import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Prisma ships a native query engine and cheerio is server-only; keep both out of the bundle.
  serverExternalPackages: ['@prisma/client', 'prisma', 'cheerio'],
}

export default config

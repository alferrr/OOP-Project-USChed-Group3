import { PrismaClient, Prisma } from '@prisma/client'

interface Cached {
  client: PrismaClient
  url: string | undefined
}
const g = globalThis as unknown as { __uchedPrismaCache?: Cached }

function create(): Cached {
  const url = process.env.DATABASE_URL
  return { client: new PrismaClient({ log: ['error'] }), url }
}

/**
 * One client per process (also across dev hot reloads). Connection details come from DATABASE_URL. Prisma reads
 * that variable when the client is built, so if it was missing then (e.g. .env created while `next dev` was
 * running) the cached client is rebuilt instead of staying broken until a restart.
 */
function current(): PrismaClient {
  if (!g.__uchedPrismaCache || g.__uchedPrismaCache.url !== process.env.DATABASE_URL) {
    void g.__uchedPrismaCache?.client.$disconnect()
    g.__uchedPrismaCache = create()
  }
  return g.__uchedPrismaCache.client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => Reflect.get(current(), prop),
})

/** True for a unique-constraint violation (a concurrent writer created the same row first). */
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
}

/** Look a row up, create it when missing, and survive losing a race with another writer. */
export async function getOrCreate<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  const existing = await find()
  if (existing) return existing
  try {
    return await create()
  } catch (e) {
    if (!isUniqueViolation(e)) throw e
    const winner = await find()
    if (!winner) throw e
    return winner
  }
}

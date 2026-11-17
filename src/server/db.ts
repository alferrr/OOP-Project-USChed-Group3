import { PrismaClient, Prisma } from '@prisma/client'

const g = globalThis as unknown as { __uchedPrisma?: PrismaClient }

/** One client per process (also across dev hot reloads). Connection details come from DATABASE_URL. */
export const prisma: PrismaClient = (g.__uchedPrisma ??= new PrismaClient({ log: ['error'] }))

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

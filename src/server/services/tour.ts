import { prisma } from '../db'

export async function hasSeenTour(studentIdNumber: string): Promise<boolean> {
  return (await prisma.tourCompletion.findUnique({ where: { studentIdNumber } })) !== null
}

/** Idempotent: finishing or skipping twice is the same as once. */
export async function markTourSeen(studentIdNumber: string): Promise<void> {
  await prisma.tourCompletion.upsert({ where: { studentIdNumber }, create: { studentIdNumber }, update: {} })
}

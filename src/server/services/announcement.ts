import { prisma } from '../db'
import { InvalidCourseDataError } from '../errors'

export type Tone = 'info' | 'warning'
export interface AnnouncementView { message: string; tone: Tone; active: boolean; updatedAt: string | null }

const ID = 1

const view = (r: { message: string; tone: string; active: boolean; updatedAt: Date } | null): AnnouncementView =>
  r ? { message: r.message, tone: r.tone === 'warning' ? 'warning' : 'info', active: r.active, updatedAt: r.updatedAt.toISOString() } : { message: '', tone: 'info', active: false, updatedAt: null }

/** What the admin sees and edits. */
export async function getAnnouncement(): Promise<AnnouncementView> {
  return view(await prisma.announcement.findUnique({ where: { id: ID } }))
}

/** What students see: only a switched-on, non-blank message. */
export async function publicAnnouncement(): Promise<AnnouncementView | null> {
  const a = await getAnnouncement()
  return a.active && a.message.trim() !== '' ? a : null
}

export async function setAnnouncement(message: string, tone: string, active: boolean): Promise<AnnouncementView> {
  const text = message.trim()
  if (tone !== 'info' && tone !== 'warning') throw new InvalidCourseDataError('Tone must be info or warning.')
  if (text.length > 280) throw new InvalidCourseDataError('The message can be at most 280 characters.')
  if (active && text === '') throw new InvalidCourseDataError('Write a message before switching the announcement on.')
  const row = await prisma.announcement.upsert({
    where: { id: ID },
    create: { id: ID, message: text, tone, active },
    update: { message: text, tone, active },
  })
  return view(row)
}

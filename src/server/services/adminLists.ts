import { getConfig } from '../config'
import { prisma } from '../db'
import { ismisSessions } from './ismisSessions'

export const PAGE_SIZE = 15

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

function paginate<T>(all: T[], page: number): Page<T> {
  const last = Math.max(0, Math.ceil(all.length / PAGE_SIZE) - 1)
  const p = Math.min(Math.max(0, page), last)
  return { items: all.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE), total: all.length, page: p, size: PAGE_SIZE }
}

export interface StudentRow { student: string; courses: number; searches: number; lastActive: string | null }
export interface CourseRow { code: string; name: string; department: string; units: number; students: number }
export interface SearchRow { student: string; semester: string; academicYear: string; source: string; courses: number; sections: number; skipped: number; at: string }
export interface ConsentRow { session: string; termsVersion: string; agreedTerms: boolean; agreedCredentialUse: boolean; at: string }
export interface SessionRow { student: string; signedInAt: string; lastUsed: string; expiresAt: string; busy: boolean }

export async function listStudents(page: number): Promise<Page<StudentRow>> {
  const [courses, snaps] = await Promise.all([
    prisma.course.groupBy({ by: ['studentIdNumber'], _count: { _all: true } }),
    prisma.catalogSnapshot.groupBy({ by: ['studentIdNumber'], _count: { _all: true }, _max: { scrapedAt: true } }),
  ])
  const rows = new Map<string, StudentRow>()
  const row = (id: string) => rows.get(id) ?? rows.set(id, { student: id, courses: 0, searches: 0, lastActive: null }).get(id)!
  for (const c of courses) row(c.studentIdNumber).courses = c._count._all
  for (const s of snaps) {
    const r = row(s.studentIdNumber)
    r.searches = s._count._all
    r.lastActive = s._max.scrapedAt?.toISOString() ?? null
  }
  const sorted = [...rows.values()].sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? '') || b.courses - a.courses)
  return paginate(sorted, page)
}

export async function listCourses(page: number, q: string): Promise<Page<CourseRow>> {
  const term = q.trim()
  const groups = await prisma.course.groupBy({
    by: ['code', 'name', 'department'],
    where: term ? { OR: [{ code: { contains: term } }, { name: { contains: term } }] } : undefined,
    _count: { _all: true },
    _max: { units: true },
    orderBy: { code: 'asc' },
  })
  const rows = groups.map((g) => ({
    code: g.code,
    name: g.name,
    department: g.department ?? '',
    units: Number(g._max.units ?? 0),
    students: g._count._all,
  }))
  return paginate(rows, page)
}

export async function listSearches(page: number): Promise<Page<SearchRow>> {
  const [total, rows] = await Promise.all([
    prisma.catalogSnapshot.count(),
    prisma.catalogSnapshot.findMany({ orderBy: { scrapedAt: 'desc' }, skip: Math.max(0, page) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  return {
    total,
    page: Math.max(0, page),
    size: PAGE_SIZE,
    items: rows.map((r) => ({
      student: r.studentIdNumber,
      semester: r.semester,
      academicYear: r.academicYear,
      source: r.source,
      courses: r.courseCount,
      sections: r.sectionCount,
      skipped: r.skippedCount,
      at: r.scrapedAt.toISOString(),
    })),
  }
}

export async function listConsents(page: number): Promise<Page<ConsentRow>> {
  const [total, rows] = await Promise.all([
    prisma.consentRecord.count(),
    prisma.consentRecord.findMany({ orderBy: { acceptedAt: 'desc' }, skip: Math.max(0, page) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  return {
    total,
    page: Math.max(0, page),
    size: PAGE_SIZE,
    items: rows.map((r) => ({
      session: r.sessionId.slice(0, 8),
      termsVersion: r.termsVersion,
      agreedTerms: r.agreedTerms,
      agreedCredentialUse: r.agreedCredentialUse,
      at: r.acceptedAt.toISOString(),
    })),
  }
}

export interface AnnouncementRow { admin: string; message: string; tone: string; active: boolean; at: string }
export interface AuditRow { admin: string; action: string; target: string; detail: string; at: string }
export interface IsmisEventRow { kind: string; at: string }
export interface AdminRow { student: string; source: string }

export async function listAudit(page: number): Promise<Page<AuditRow>> {
  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: Math.max(0, page) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  return {
    total, page: Math.max(0, page), size: PAGE_SIZE,
    items: rows.map((r) => ({ admin: r.adminStudentIdNumber, action: r.action, target: r.target, detail: r.detail, at: r.createdAt.toISOString() })),
  }
}

export async function listAnnouncements(page: number): Promise<Page<AnnouncementRow>> {
  const [total, rows] = await Promise.all([
    prisma.announcementLog.count(),
    prisma.announcementLog.findMany({ orderBy: { createdAt: 'desc' }, skip: Math.max(0, page) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  return {
    total, page: Math.max(0, page), size: PAGE_SIZE,
    items: rows.map((r) => ({ admin: r.adminStudentIdNumber, message: r.message, tone: r.tone, active: r.active, at: r.createdAt.toISOString() })),
  }
}

export async function listIsmisEvents(page: number): Promise<Page<IsmisEventRow>> {
  const [total, rows] = await Promise.all([
    prisma.ismisEvent.count(),
    prisma.ismisEvent.findMany({ orderBy: { occurredAt: 'desc' }, skip: Math.max(0, page) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  return { total, page: Math.max(0, page), size: PAGE_SIZE, items: rows.map((r) => ({ kind: r.kind, at: r.occurredAt.toISOString() })) }
}

/** The admin list comes from UCHED_ADMIN_IDS (or the built-in default); it is read-only here. */
export function listAdmins(page: number): Page<AdminRow> {
  const fromEnv = (process.env.UCHED_ADMIN_IDS ?? '').trim() !== ''
  return paginate(getConfig().admin.studentIds.map((student) => ({ student, source: fromEnv ? 'UCHED_ADMIN_IDS' : 'Built-in default' })), page)
}

export function listSessions(page: number): Page<SessionRow> {
  const rows = ismisSessions()
    .overview()
    .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
    .map((s) => ({
      student: s.studentIdNumber,
      signedInAt: s.createdAt.toISOString(),
      lastUsed: s.lastUsed.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      busy: s.busy,
    }))
  return paginate(rows, page)
}

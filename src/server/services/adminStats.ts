import { getConfig } from '../config'
import { prisma } from '../db'
import { ismisSessions } from './ismisSessions'

const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface AdminStats {
  generatedAt: string
  kpis: {
    students: number
    courses: number
    sections: number
    instructors: number
    activeSessions: number
    maxSessions: number
    searchesThisWeek: number
    searchesLastWeek: number
    consentsThisWeek: number
    consentsLastWeek: number
  }
  /** Last 12 months, oldest first. */
  searchesByMonth: { month: string; label: string; searches: number; students: number }[]
  topDepartments: { department: string; courses: number }[]
  terms: { semester: string; academicYear: string; searches: number; sections: number }[]
  retention: { rate: number; returning: number; total: number }
  recent: { student: string; semester: string; academicYear: string; courses: number; sections: number; at: string }[]
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export async function adminStats(now = new Date()): Promise<AdminStats> {
  const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const week = new Date(now.getTime() - 7 * DAY)
  const twoWeeks = new Date(now.getTime() - 14 * DAY)

  const [studentGroups, courses, sections, instructors, snapshots, consentsThisWeek, consentsLastWeek, deptGroups, termGroups, recent] =
    await Promise.all([
      prisma.course.groupBy({ by: ['studentIdNumber'] }),
      prisma.course.count(),
      prisma.section.count(),
      prisma.instructor.count(),
      prisma.catalogSnapshot.findMany({ select: { studentIdNumber: true, scrapedAt: true } }),
      prisma.consentRecord.count({ where: { acceptedAt: { gte: week } } }),
      prisma.consentRecord.count({ where: { acceptedAt: { gte: twoWeeks, lt: week } } }),
      prisma.course.groupBy({ by: ['department'], _count: { _all: true }, orderBy: { _count: { department: 'desc' } }, take: 6 }),
      prisma.catalogSnapshot.groupBy({ by: ['semester', 'academicYear'], _count: { _all: true }, _sum: { sectionCount: true } }),
      prisma.catalogSnapshot.findMany({ orderBy: { scrapedAt: 'desc' }, take: 6 }),
    ])

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1)
    return { month: monthKey(d), label: MONTHS[d.getMonth()], searches: 0, people: new Set<string>() }
  })
  const byMonth = new Map(months.map((m) => [m.month, m]))
  const perStudent = new Map<string, number>()
  let searchesThisWeek = 0
  let searchesLastWeek = 0
  for (const s of snapshots) {
    perStudent.set(s.studentIdNumber, (perStudent.get(s.studentIdNumber) ?? 0) + 1)
    const m = byMonth.get(monthKey(s.scrapedAt))
    if (m) { m.searches++; m.people.add(s.studentIdNumber) }
    if (s.scrapedAt >= week) searchesThisWeek++
    else if (s.scrapedAt >= twoWeeks) searchesLastWeek++
  }
  const total = perStudent.size
  const returning = [...perStudent.values()].filter((n) => n > 1).length

  return {
    generatedAt: now.toISOString(),
    kpis: {
      students: studentGroups.length,
      courses,
      sections,
      instructors,
      activeSessions: ismisSessions().activeSessions(),
      maxSessions: getConfig().ismisSession.maxSessions,
      searchesThisWeek,
      searchesLastWeek,
      consentsThisWeek,
      consentsLastWeek,
    },
    searchesByMonth: months.map((m) => ({ month: m.month, label: m.label, searches: m.searches, students: m.people.size })),
    topDepartments: deptGroups.map((g) => ({ department: g.department ?? 'Unassigned', courses: g._count._all })),
    terms: termGroups
      .map((g) => ({ semester: g.semester, academicYear: g.academicYear, searches: g._count._all, sections: g._sum.sectionCount ?? 0 }))
      .sort((a, b) => b.academicYear.localeCompare(a.academicYear) || a.semester.localeCompare(b.semester)),
    retention: { rate: total === 0 ? 0 : returning / total, returning, total },
    recent: recent.map((r) => ({
      student: r.studentIdNumber,
      semester: r.semester,
      academicYear: r.academicYear,
      courses: r.courseCount,
      sections: r.sectionCount,
      at: r.scrapedAt.toISOString(),
    })),
  }
}

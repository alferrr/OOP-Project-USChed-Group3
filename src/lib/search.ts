import type { CourseRef, CourseSummary, SearchItem } from '../api/types'

export const MAX_CODES = 15

/** Splits typed or pasted text on commas, semicolons and line breaks; trims and collapses spaces. */
export function parseCodes(text: string): string[] {
  return text
    .split(/[,;\n\r]+/)
    .map((c) => c.trim().replace(/\s+/g, ' '))
    .filter((c) => c.length > 0)
}

/** Adds codes to a list, ignoring duplicates (any case) and stopping at the limit. */
export function addCodes(existing: string[], incoming: string[], max = MAX_CODES): string[] {
  const out = [...existing]
  const seen = new Set(existing.map((c) => c.toLowerCase()))
  for (const c of incoming) {
    if (out.length >= max) break
    if (!seen.has(c.toLowerCase())) {
      out.push(c)
      seen.add(c.toLowerCase())
    }
  }
  return out
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/**
 * The courses to add to the selection after a search: the result whose code equals what was typed, or,
 * for a description search that found exactly one course, that course. Broader matches stay in the list only.
 */
export function pickCoursesToSelect(items: SearchItem[]): CourseSummary[] {
  const picked = new Map<number, CourseSummary>()
  const toSummary = (c: CourseRef): CourseSummary => ({
    id: c.id, code: c.code, name: c.name, units: c.units, department: null, prerequisites: null,
  })
  for (const item of items) {
    if (item.status !== 'DONE') continue
    const exact = item.found.filter((c) => squash(c.code) === squash(item.query))
    const chosen = exact.length > 0 ? exact : item.found.length === 1 ? item.found : []
    chosen.forEach((c) => picked.set(c.id, toSummary(c)))
  }
  return [...picked.values()]
}

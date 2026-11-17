import type { Course } from '../domain/model'

export function courseSummary(c: Course) {
  return { id: c.id, code: c.code, name: c.name, units: c.units, department: c.department, prerequisites: c.prerequisites }
}

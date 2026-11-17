import type { Course } from '../domain/model'

export type SourceType = 'ISMIS' | 'CSV' | 'MOCK'

/**
 * Courses already read from somewhere (ISMIS, a CSV, a test), ready to import. The importer depends only on
 * this shape: it cannot tell ISMIS from a CSV or a mock.
 */
export interface FetchedCourses {
  type: SourceType
  courses: readonly Course[]
  /** Records skipped while reading (bad rows), for the import report. */
  skipped: readonly string[]
  /** False when the source has no units information (the importer then keeps units it already knows). */
  providesUnits: boolean
}

import { BadRequestError, route } from '@/server/http/api'
import { readCsvCourses } from '@/server/datasource/csv'
import { semesterFromCode } from '@/server/domain/model'
import { InvalidCourseDataError } from '@/server/errors'
import { audit } from '@/server/services/adminAudit'
import { importCourses } from '@/server/services/courseImport'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024

/** The admin console's CSV import: the same import as /api/admin/import, but for a signed-in admin instead of a shared token. */
export const POST = route({ guard: 'adminSession' }, async ({ req, studentIdNumber }) => {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    throw new BadRequestError()
  }
  const file = form.get('file')
  const semester = form.get('semester')
  const academicYear = form.get('academicYear')
  const target = form.get('studentIdNumber')
  if (!(file instanceof File) || typeof semester !== 'string' || typeof academicYear !== 'string' || typeof target !== 'string') throw new BadRequestError()
  if (target.trim() === '' || target.length > 64) throw new InvalidCourseDataError('Enter the student ID number whose catalog this belongs to.')
  if (file.size > MAX_BYTES) throw new BadRequestError()
  if (file.size === 0) throw new InvalidCourseDataError('The CSV file is empty.')

  const sem = semesterFromCode(semester)
  const report = await importCourses(readCsvCourses(await file.text(), sem, academicYear), sem, academicYear, target.trim())
  await audit(studentIdNumber, 'IMPORT_CSV', target.trim(), `${report.courses} courses, ${report.sections} sections (${semester} ${academicYear})`)
  return report
})

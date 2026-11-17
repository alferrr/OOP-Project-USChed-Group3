import { BadRequestError, route } from '@/server/http/api'
import { readCsvCourses } from '@/server/datasource/csv'
import { semesterFromCode } from '@/server/domain/model'
import { InvalidCourseDataError } from '@/server/errors'
import { importCourses } from '@/server/services/courseImport'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024

/** Protected by the admin token. studentIdNumber says whose private catalog this CSV is imported into. */
export const POST = route({ guard: 'admin' }, async ({ req }) => {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    throw new BadRequestError()
  }
  const field = (name: string) => (form.get(name) ?? req.nextUrl.searchParams.get(name))
  const file = form.get('file')
  const semester = field('semester')
  const academicYear = field('academicYear')
  const studentIdNumber = field('studentIdNumber')
  if (!(file instanceof File) || typeof semester !== 'string' || typeof academicYear !== 'string' || typeof studentIdNumber !== 'string') {
    throw new BadRequestError()
  }
  if (file.size > MAX_BYTES) throw new BadRequestError()
  if (file.size === 0) throw new InvalidCourseDataError('The CSV file is empty.')

  const sem = semesterFromCode(semester)
  const source = readCsvCourses(await file.text(), sem, academicYear)
  return importCourses(source, sem, academicYear, studentIdNumber)
})

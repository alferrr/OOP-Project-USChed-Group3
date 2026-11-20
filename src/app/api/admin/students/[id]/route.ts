import { BadRequestError, route } from '@/server/http/api'
import { audit } from '@/server/services/adminAudit'
import { deleteStudentData } from '@/server/services/studentData'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Deletes everything held about one student ID number and signs them out. Recorded in the audit log. */
export const DELETE = route({ guard: 'adminSession' }, async ({ params, studentIdNumber }) => {
  const target = decodeURIComponent(params.id).trim()
  if (target === '' || target.length > 64) throw new BadRequestError()
  const report = await deleteStudentData(target)
  await audit(studentIdNumber, 'DELETE_STUDENT_DATA', target,
    `${report.courses} courses, ${report.searches} searches, ${report.savedSchedules} saved schedules`)
  return report
})

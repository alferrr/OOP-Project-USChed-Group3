import { prisma } from '../db'

/** Writes one line to the admin audit log. Awaited: an action that cannot be recorded should not look like it succeeded. */
export async function audit(adminStudentIdNumber: string, action: string, target = '', detail = ''): Promise<void> {
  await prisma.adminAuditLog.create({
    data: { adminStudentIdNumber, action: action.slice(0, 40), target: target.slice(0, 255), detail: detail.slice(0, 255) },
  })
}

import { afterEach, describe, expect, it } from 'vitest'
import { isAdminStudent, resetConfigForTests } from '@/server/config'
import { maskStudentId } from '@/server/services/adminStats'

afterEach(() => {
  delete process.env.UCHED_ADMIN_IDS
  resetConfigForTests()
})

describe('admin access', () => {
  it('makes 19020241 the admin by default and nobody else', () => {
    expect(isAdminStudent('19020241')).toBe(true)
    expect(isAdminStudent('19020242')).toBe(false)
    expect(isAdminStudent('')).toBe(false)
  })

  it('can be overridden with a comma-separated list', () => {
    process.env.UCHED_ADMIN_IDS = '111, 222'
    resetConfigForTests()
    expect(isAdminStudent('222')).toBe(true)
    expect(isAdminStudent('19020241')).toBe(false)
  })

  it('masks ID numbers in the dashboard lists', () => {
    expect(maskStudentId('19020241')).toBe('19****41')
    expect(maskStudentId('123')).toBe('***')
  })
})

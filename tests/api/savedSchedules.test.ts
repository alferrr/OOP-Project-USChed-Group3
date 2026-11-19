import { describe, expect, it } from 'vitest'
import { scheduleKey } from '@/server/services/savedSchedules'

describe('scheduleKey', () => {
  it('is the sorted section ids, so the same sections are one save in any order', () => {
    expect(scheduleKey([12, 3, 7])).toBe('3,7,12')
    expect(scheduleKey([7, 12, 3])).toBe(scheduleKey([3, 12, 7]))
  })

  it('matches the key the browser uses', async () => {
    const { savedId } = await import('@/store/planStore')
    const schedule = { rank: 1, score: 1, breakdown: {}, stats: { schoolDays: 0, earliestStart: null, latestEnd: null, totalGapMinutes: 0, totalUnits: 0 },
      sections: [{ sectionId: 9 }, { sectionId: 2 }] } as never
    expect(savedId(schedule)).toBe(scheduleKey([9, 2]))
  })
})

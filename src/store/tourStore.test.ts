import { beforeEach, describe, expect, it } from 'vitest'
import { TOUR_STEPS } from '../lib/tour'
import { useTourStore } from './tourStore'

beforeEach(() => useTourStore.setState({ active: false, step: 0 }))

describe('tourStore', () => {
  it('walks forward and back without going below the first step', () => {
    const t = useTourStore.getState()
    t.start(); t.next(); t.next(); t.back(); t.back(); t.back()
    expect(useTourStore.getState()).toMatchObject({ active: true, step: 0 })
  })

  it('stops and rewinds', () => {
    const t = useTourStore.getState()
    t.start(); t.next(); t.stop()
    expect(useTourStore.getState()).toMatchObject({ active: false, step: 0 })
  })

  it('only points at page-specific steps that name their target', () => {
    for (const s of TOUR_STEPS) if (s.page) expect(s.target).toBeTruthy()
  })
})

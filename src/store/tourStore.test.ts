import { beforeEach, describe, expect, it } from 'vitest'
import { TOUR_STEPS } from '../lib/tour'
import { useTourStore } from './tourStore'

beforeEach(() => {
  window.localStorage.clear()
  useTourStore.setState({ ready: false, seen: true, active: false, step: 0 })
})

describe('tourStore', () => {
  it('is offered on a browser that has not seen it, and not after finishing', () => {
    useTourStore.getState().hydrate()
    expect(useTourStore.getState().seen).toBe(false)
    useTourStore.getState().start()
    useTourStore.getState().finish()
    useTourStore.getState().hydrate()
    expect(useTourStore.getState()).toMatchObject({ seen: true, active: false })
  })

  it('walks forward and back without going below the first step', () => {
    const t = useTourStore.getState()
    t.start(); t.next(); t.next(); t.back(); t.back(); t.back()
    expect(useTourStore.getState().step).toBe(0)
  })

  it('stops on reset without remembering it as seen', () => {
    useTourStore.getState().hydrate()
    useTourStore.getState().start()
    useTourStore.getState().reset()
    useTourStore.getState().hydrate()
    expect(useTourStore.getState()).toMatchObject({ active: false, seen: false })
  })

  it('only points at page-specific steps that name their page', () => {
    for (const s of TOUR_STEPS) if (s.page) expect(s.target).toBeTruthy()
  })
})

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGuideStore } from '../../store/guideStore'
import { useSelectionStore } from '../../store/planStore'
import QuestGuide from './QuestGuide'

beforeEach(() => {
  window.localStorage.clear()
  useGuideStore.setState({ status: 'done', open: false, done: [], toast: null })
  useSelectionStore.getState().clear()
})

describe('QuestGuide', () => {
  it('welcomes a first-time student and starts the quest', async () => {
    render(<QuestGuide />)
    expect(screen.getByRole('dialog', { name: /welcome to usched/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /start the quest/i }))
    expect(screen.getByRole('region', { name: /getting started quests/i })).toBeInTheDocument()
    expect(screen.getByText('Pick your courses')).toBeInTheDocument()
    expect(window.localStorage.getItem('usched.guide.v1')).toBe('active')
  })

  it('does not welcome again once skipped', async () => {
    const { unmount } = render(<QuestGuide />)
    await userEvent.click(screen.getByRole('button', { name: /skip for now/i }))
    unmount()
    render(<QuestGuide />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ticks a quest off when the student does it and awards XP', async () => {
    window.localStorage.setItem('usched.guide.v1', 'active')
    render(<QuestGuide />)
    await act(async () => {
      useSelectionStore.getState().toggle({ id: 1, code: 'CIS 2105', name: 'DS', units: 3 } as never)
    })
    expect(await screen.findByRole('status')).toHaveTextContent('+20 XP')
    expect(screen.getByRole('button', { name: /20 of 100 xp/i })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NotFound from './not-found'

describe('NotFound', () => {
  it('says the page does not exist, in plain words, and offers a way back', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { name: /this page isn’t on your schedule/i })).toBeInTheDocument()
    expect(screen.getByText(/error 404 · section not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your courses' })).toHaveAttribute('href', '/courses')
    expect(screen.getByRole('link', { name: 'Read the Terms' })).toHaveAttribute('href', '/terms')
  })

  it('keeps the animated timetable out of the accessibility tree', () => {
    const { container } = render(<NotFound />)
    expect(container.querySelector('[aria-hidden="true"] .lost-block')).not.toBeNull()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NotFound from './not-found'

describe('NotFound', () => {
  it('says the page does not exist and offers a way back', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Courses' })).toHaveAttribute('href', '/courses')
    expect(screen.getByRole('link', { name: 'Read the Terms' })).toHaveAttribute('href', '/terms')
  })
})

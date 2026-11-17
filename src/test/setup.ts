import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetNavigation } from './navigation'

// next/navigation needs the App Router at runtime; unit tests get a controllable fake instead.
vi.mock('next/navigation', () => import('./navigation'))

afterEach(() => {
  cleanup()
  resetNavigation()
})

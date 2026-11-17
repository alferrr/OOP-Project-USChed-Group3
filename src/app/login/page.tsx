import { Suspense } from 'react'
import LoginPage from '../../views/LoginPage'

// Full-bleed: no header/footer chrome around the front door.
export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}

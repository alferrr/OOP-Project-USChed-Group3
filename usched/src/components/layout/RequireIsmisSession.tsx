import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useIsmisStore } from '../../store/ismisStore'

/** Every page except Login and Terms needs a signed-in ISMIS session; losing it sends the student back to Login. */
export default function RequireIsmisSession() {
  const signedIn = useIsmisStore((s) => !!s.sessionId)
  const location = useLocation()
  return signedIn ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

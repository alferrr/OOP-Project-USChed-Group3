import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RequireIsmisSession from './components/layout/RequireIsmisSession'
import CourseSelectionPage from './pages/CourseSelectionPage'
import LoginPage from './pages/LoginPage'
import SchedulesPage from './pages/SchedulesPage'
import TermsPage from './pages/TermsPage'

export default function App() {
  return (
    <Routes>
      {/* Full-bleed: no header/footer chrome around the front door. */}
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/terms" element={<TermsPage />} />
        <Route element={<RequireIsmisSession />}>
          <Route path="/courses" element={<CourseSelectionPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/courses" replace />} />
      </Route>
    </Routes>
  )
}

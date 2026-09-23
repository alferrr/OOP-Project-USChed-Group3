import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from './client'
import { useConsentStore } from '../store/consentStore'
import { useIsmisStore } from '../store/ismisStore'
import { clearStudentData } from '../store/resetAll'
import type {
  CompareResponse, ConsentResponse, CoursePage, GenerateRequest, GenerateResponse, IsmisSession,
  Option, Prospectus, SearchStart, SearchStatus, SemesterCode, Section, Terms,
} from './types'

const TERMINAL = ['DONE', 'FAILED']

export const useTerms = () => useQuery({ queryKey: ['terms'], queryFn: () => api<Terms>('/consent/terms') })

export const useSemesters = () => useQuery({ queryKey: ['semesters'], queryFn: () => api<Option[]>('/meta/semesters') })
export const useAcademicYears = () =>
  useQuery({ queryKey: ['academic-years'], queryFn: () => api<string[]>('/meta/academic-years', { ismis: true }) })
export const useDepartments = () => useQuery({ queryKey: ['departments'], queryFn: () => api<string[]>('/meta/departments', { ismis: true }) })

export const useCourses = (p: { q: string; department: string; semester: SemesterCode; academicYear: string; page: number; size?: number }) =>
  useQuery({
    queryKey: ['courses', p],
    queryFn: () => api<CoursePage>(`/courses${qs({ ...p, size: p.size ?? 12 })}`, { ismis: true }),
    placeholderData: (prev) => prev,
  })

/** Empties the signed-in student's own fetched catalog (every course/section imported from ISMIS so far). */
export const useClearCatalog = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/courses', { method: 'DELETE', ismis: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export const useSections = (courseId: number, semester: SemesterCode, academicYear: string, enabled: boolean) =>
  useQuery({
    queryKey: ['sections', courseId, semester, academicYear],
    queryFn: () => api<Section[]>(`/courses/${courseId}/sections${qs({ semester, academicYear })}`, { ismis: true }),
    enabled,
  })

export const useGenerate = () => useMutation({ mutationFn: (req: GenerateRequest) => api<GenerateResponse>('/schedules/generate', { body: req, ismis: true }) })

export const useCompare = () =>
  useMutation({
    mutationFn: (v: { schedules: number[][]; preferences?: GenerateRequest['preferences'] }) =>
      api<CompareResponse>('/schedules/compare', { body: v, ismis: true }),
  })

/**
 * Accepts the Terms, then signs in to ISMIS. Both happen on one click so the Terms are always on screen
 * first. gcTime 0 and no retries: variables (which hold the password) are dropped from the cache as soon as
 * the mutation settles. clearStudentData() runs before setting the new session: everything a student sees is
 * scoped to them on the server, but nothing client-side (React Query's cache, the selection/schedule/
 * preferences stores) is, so without this a second student signing in in the same browser tab would see the
 * first student's already-fetched courses and picks.
 */
export const useIsmisSignIn = () => {
  const setConsent = useConsentStore((s) => s.setConsent)
  const setSession = useIsmisStore((s) => s.setSession)
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (v: { termsVersion: string; username: string; password: string }) => {
      const consent = await api<ConsentResponse>('/consent', {
        body: { termsVersion: v.termsVersion, agreedTerms: true, agreedCredentialUse: true },
      })
      setConsent(consent.consentToken, consent.expiresAt)
      return api<IsmisSession>('/ismis/session', { body: { username: v.username, password: v.password }, consent: true })
    },
    onSuccess: (s) => {
      clearStudentData()
      setSession(s.sessionId, s.idleMinutes)
    },
  })
}

/** clearStudentData() for the same reason as sign-in: nothing from this student should linger for the next. */
export const useIsmisSignOut = () => {
  const end = useIsmisStore((s) => s.end)
  return useMutation({
    mutationFn: () => api<void>('/ismis/session', { method: 'DELETE', consent: true, ismis: true }),
    onSettled: () => {
      clearStudentData()
      end()
    },
  })
}

export const useStartSearch = () =>
  useMutation({
    retry: false,
    mutationFn: (v: { semester: SemesterCode; academicYear: string; queries: string[] }) =>
      api<SearchStart>('/ismis/searches', { body: v, consent: true, ismis: true }),
  })

/** Fetched once per ISMIS session (the server caches it too); React Query keeps it after that. */
export const useProspectus = (enabled: boolean) =>
  useQuery({
    queryKey: ['prospectus'],
    queryFn: () => api<Prospectus>('/ismis/prospectus', { consent: true, ismis: true }),
    enabled,
    staleTime: Infinity,
    retry: false,
  })

export const useSearchStatus = (jobId: string | null) => {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['search', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const s = await api<SearchStatus>(`/ismis/searches/${jobId}`, { consent: true })
      if (s.status === 'DONE') {
        void qc.invalidateQueries({ queryKey: ['courses'] })
        void qc.invalidateQueries({ queryKey: ['departments'] })
        void qc.invalidateQueries({ queryKey: ['academic-years'] })
      }
      return s
    },
    refetchInterval: (q) => (q.state.data && TERMINAL.includes(q.state.data.status) ? false : 800),
  })
}

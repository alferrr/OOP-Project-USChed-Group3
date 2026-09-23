import { queryClient } from '../api/queryClient'
import { useSelectionStore, useScheduleStore, usePreferencesStore } from './planStore'

/**
 * Clears every piece of state that reflects a specific student's own courses, schedules and preferences, so
 * nothing from one signed-in student can be seen by whoever is signed in next in the same browser tab.
 *
 * This is the single place all of that lives: the server-fetched query cache (React Query) *and* the
 * client-only Zustand stores (selection, generated schedules, preferences), which the query cache clear alone
 * does not touch. Call this on sign-in, on sign-out, and whenever a session is found to have expired — every
 * caller should go through here rather than clearing pieces individually, so a store added later isn't missed.
 */
export function clearStudentData() {
  queryClient.clear()
  useSelectionStore.getState().clear()
  useScheduleStore.getState().reset()
  usePreferencesStore.getState().reset()
}

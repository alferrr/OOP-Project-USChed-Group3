export interface TourStep {
  id: string
  title: string
  body: string
  /** data-tour value of the element to point at; no target means a centered card. */
  target?: string
  /** The page the target lives on. */
  page?: string
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', title: 'Welcome to USChed', body: 'A quick tour (about 30 seconds) of how to go from "which classes?" to a schedule you can take to enrollment.' },
  { id: 'term', page: '/courses', target: 'term', title: '1. Choose the term',
    body: 'Pick the semester and academic year you are planning. Searches and schedules use this term.' },
  { id: 'fetch', page: '/courses', target: 'fetch', title: '2. Find your courses',
    body: 'Add a year level from your prospectus, or type course codes like CIS 2105. Then fetch them from ISMIS, which shows the sections offered this term.' },
  { id: 'saved', page: '/courses', target: 'saved', title: '3. Pick from your saved courses',
    body: 'Everything you fetched is listed here. Open a course to see its sections, and select the ones you want to take.' },
  { id: 'plan', page: '/courses', target: 'plan', title: '4. Generate schedules',
    body: 'Your selected courses and total units appear here. Press Generate Schedules and USChed builds conflict-free options and ranks them.' },
  { id: 'preferences', page: '/courses', target: 'preferences', title: '5. Say what matters to you',
    body: 'Open Preferences to avoid certain days or teachers, set the earliest start, or prefer mornings. Rules under "Must follow" drop schedules; the rest just rank them.' },
  { id: 'nav', target: 'nav', title: '6. Find your results',
    body: 'Schedules is where results show up: a weekly calendar, a score and trade-offs for each option, saving favorites, comparing up to four, and printing.' },
  { id: 'done', title: 'You are ready', body: 'You can replay this tour any time from "Tour" in the top bar. USChed never enrolls you, so always enroll in the official ISMIS.' },
]

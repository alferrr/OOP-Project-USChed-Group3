export interface TourStep {
  id: string
  title: string
  body: string
  /** data-tour value of the element to point at; no target means a centered card. */
  target?: string
  /** The page the target lives on. */
  page?: string
  /** Shown only to regular students (those following their program's prospectus). */
  regularOnly?: boolean
  /** Asks whether the student is regular; the answer decides which later steps appear. */
  asksRegular?: boolean
}

const ALL_STEPS: TourStep[] = [
  { id: 'welcome', title: 'Welcome to USChed', body: 'A quick tour (about 30 seconds) of how to go from "which classes?" to a schedule you can take to enrollment. First: are you a regular student, one who follows the subjects listed in your program\'s prospectus?', asksRegular: true },
  { id: 'term', page: '/courses', target: 'term', title: 'Choose the term',
    body: 'Pick the semester and academic year you are planning. Searches and schedules use this term.' },
  { id: 'prospectus', page: '/courses', target: 'prospectus', regularOnly: true, title: 'Use your prospectus',
    body: 'As a regular student you can skip the typing. Open "Use my prospectus", pick your year level and term, and add all of that term\'s subjects at once. You can also mark the ones you have already passed.' },
  { id: 'fetch', page: '/courses', target: 'fetch', title: 'Find your courses',
    body: 'Type the course codes you need, like CIS 2105, then fetch them from ISMIS. It shows the sections offered this term.' },
  { id: 'saved', page: '/courses', target: 'saved', title: 'Pick from your saved courses',
    body: 'Everything you fetched is listed here. Open a course to see its sections, and select the ones you want to take.' },
  { id: 'plan', page: '/courses', target: 'plan', title: 'Generate schedules',
    body: 'Your selected courses and total units appear here. Press Generate Schedules and USChed builds conflict-free options and ranks them.' },
  { id: 'preferences', page: '/courses', target: 'preferences', title: 'Say what matters to you',
    body: 'Open Preferences to avoid certain days or teachers, set the earliest start, or prefer mornings. Rules under "Must follow" drop schedules; the rest just rank them.' },
  { id: 'nav', target: 'nav', title: 'Find your results',
    body: 'Schedules is where results show up: a weekly calendar, a score and trade-offs for each option, comparing up to four, and printing. Prefer to choose yourself? Build lets you pick each section by hand. Name and save your favorites, and find them under Saved.' },
  { id: 'done', title: 'You are ready', body: 'You can replay this tour any time: open Ask in the top bar and choose "Replay the tour". USChed never enrolls you, so always enroll in the official ISMIS.' },
]

/** The steps this student sees: regular-only steps are dropped unless they said they are regular. */
export function tourSteps(regular: boolean | null): TourStep[] {
  return ALL_STEPS.filter((s) => !s.regularOnly || regular === true)
}

/** Every step, for tests that check the whole tour. */
export const TOUR_STEPS = ALL_STEPS


export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
export type Day = (typeof DAYS)[number]

/** Course block colors: distinct tints within the green family, cycled per course. Gold stays reserved for selection. */
export const COURSE_COLORS = [
  { bg: '#dcebe1', border: '#1f6b3f', text: '#0b3a22' },
  { bg: '#d2ece6', border: '#1b7a6b', text: '#0a3a33' },
  { bg: '#e2ecd3', border: '#5b7f24', text: '#2a3d0e' },
  { bg: '#c9dfd0', border: '#16563a', text: '#0a2f1d' },
  { bg: '#d6e8f0', border: '#2c6f8a', text: '#0f3445' },
  { bg: '#e9efe3', border: '#6d8a52', text: '#2b3d1a' },
] as const

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
export type Day = (typeof DAYS)[number]

/** Course block colors in the green/gold family, cycled per course. */
export const COURSE_COLORS = [
  { bg: '#dcebe1', border: '#1f6b3f', text: '#0f4229' },
  { bg: '#faefc4', border: '#b48611', text: '#5c4408' },
  { bg: '#c7e0d0', border: '#16563a', text: '#0a2f1d' },
  { bg: '#f5e2a0', border: '#d4a017', text: '#4a3806' },
  { bg: '#e8f3ec', border: '#2f7d4f', text: '#0f4229' },
  { bg: '#fdf3cf', border: '#e7bd3a', text: '#5c4408' },
] as const

/**
 * USChed's built-in help: a written list of questions and answers, found by keyword matching. No AI model and
 * nothing leaves the browser. Keep it in step with the app: when a feature changes, change its entry here.
 */

export interface HelpLink { label: string; href: string }

export interface HelpEntry {
  id: string
  /** The question as a student would put it; also what suggestion chips show. */
  question: string
  answer: string
  /** Words and phrases that point at this entry. Multi-word phrases count for more. */
  keywords: string[]
  links?: HelpLink[]
  /** Pages (paths) where this answer is more likely to be wanted. */
  pages?: string[]
  /** A button under the answer. */
  action?: 'tour'
}

export const ENTRIES: HelpEntry[] = [
  { id: 'signin', question: 'How do I sign in?',
    answer: 'Sign in with your ISMIS student ID number and password. USChed uses your password once to sign in and then discards it. You will be asked to accept the Terms first.',
    keywords: ['sign in', 'log in', 'login', 'username', 'student id', 'id number', 'account', 'sign into'], links: [{ label: 'Read the Terms', href: '/terms' }] },
  { id: 'password', question: 'Is my password safe?',
    answer: 'Your password is sent over an encrypted connection, used once to sign in to ISMIS, and then thrown away. USChed does not save or log it. What it keeps while you are signed in is a session, which ends when you sign out, after 20 minutes without activity, or after 60 minutes in total. The Terms explain this in detail.',
    keywords: ['password', 'safe', 'secure', 'security', 'store', 'stored', 'privacy', 'private', 'credentials'], links: [{ label: 'Read the Terms', href: '/terms' }] },
  { id: 'session', question: 'Why was I signed out?',
    answer: 'Your ISMIS session ends after 20 minutes without activity, or 60 minutes in total, and when the server restarts. Just sign in again. Your saved schedules are kept on your account, but anything you had not saved (selected courses, generated results) is cleared.',
    keywords: ['signed out', 'logged out', 'log me out', 'logged me out', 'session', 'expired', 'timeout', 'time out', 'kicked out', 'sign in again'] },
  { id: 'term', question: 'How do I choose the semester?',
    answer: 'On the Courses page, use the Semester and Academic year menus at the top. Searches and schedules use that term, so set it before you fetch courses.',
    keywords: ['semester', 'term', 'academic year', 'school year', '1st sem', '2nd sem', 'summer'], pages: ['/courses'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'prospectus', question: 'How do I use my prospectus?',
    answer: 'On the Courses page, open "Use my prospectus", pick your year level and term, and add all of that term\'s subjects at once, then fetch them. It is meant for regular students who follow their program\'s prospectus. You can also mark subjects you have already passed.',
    keywords: ['prospectus', 'regular student', 'curriculum', 'year level', 'subjects', 'add all', 'whole semester', 'checklist'], pages: ['/courses'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'fetch', question: 'How do I find and fetch courses?',
    answer: 'On the Courses page, type course codes like "CIS 2105" (or pick them from the suggestions), then press "Fetch courses from ISMIS". USChed pulls the sections offered for your term from ISMIS. They then appear under "Saved courses".',
    keywords: ['fetch', 'find course', 'search course', 'add course', 'add a course', 'find a course', 'search for a course', 'course code', 'get courses', 'import', 'pull', 'look up', 'cis'], pages: ['/courses'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'noresults', question: 'Why did my search find nothing, or too much?',
    answer: 'No results usually means a typo in the code or the wrong semester and academic year. "Too many results" means the code was too general. Use a specific code like "CIS 2105". Check that the term at the top of the Courses page is the one ISMIS is offering.',
    keywords: ['no results', 'nothing found', 'not found', 'too many results', 'too many', 'cannot find', 'cant find', 'empty', 'no courses', 'not showing'], pages: ['/courses'] },
  { id: 'saved-courses', question: 'Where are my saved courses?',
    answer: 'On the Courses page, in the "Saved courses" section below the fetch box. It lists every course you fetched for the selected term. If it looks empty, check the semester and academic year match what you fetched. "Clear saved courses" removes them.',
    keywords: ['saved courses', 'my courses', 'fetched courses', 'clear saved', 'delete courses', 'remove courses', 'where are my courses'], pages: ['/courses'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'plan', question: 'How do I select courses for my plan?',
    answer: 'Open a course under "Saved courses" and select it, and it joins "Your plan" on the right with your total units. Expand a course in the plan to see its sections. Remove one with the X.',
    keywords: ['your plan', 'my plan', 'total units', 'units', 'choose courses', 'pick courses', 'select courses', 'select a course', 'remove course'], pages: ['/courses'] },
  { id: 'generate', question: 'How do I generate schedules?',
    answer: 'Select your courses, set any preferences, then press "Generate Schedules" on the plan card. USChed builds the conflict-free schedules, ranks them, and takes you to the Schedules page.',
    keywords: ['generate', 'create schedule', 'make schedule', 'make a schedule', 'conflict free', 'conflict-free', 'timetable', 'combination'], pages: ['/courses', '/schedules'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'noschedule', question: 'Why did it find no schedules?',
    answer: 'Every combination had a problem. Common reasons: two required courses only meet at the same time, a "Must follow" preference is too strict (days to avoid, earliest start, latest end, minimum break), an avoided instructor teaches the only section of a course, or two classes on different campuses are too close together (45 minutes are needed). Try loosening one preference, or removing a course, and generate again.',
    keywords: ['no schedule', 'no valid schedule', 'no schedules', 'not generating', 'cannot generate', 'cant generate', 'failed', 'impossible', 'nothing generated'], pages: ['/courses'] },
  { id: 'preferences', question: 'What are preferences?',
    answer: 'Open Preferences on the Courses page. "Must follow" rules drop any schedule that breaks them: max school days, max classes per day, minimum break, earliest start, latest end, and days to avoid. "Nice to have" only changes the ranking: morning or afternoon, fewer gaps, fewer school days, a real lunch break. The Instructors card covers teachers.',
    keywords: ['preference', 'preferences', 'must follow', 'nice to have', 'settings', 'rules', 'filter'], pages: ['/courses'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'avoid-days', question: 'How do I avoid certain days or early classes?',
    answer: 'In Preferences, under "Must follow": pick the days under "Avoid these days", or set "Earliest start" and "Latest end". Any schedule that breaks them is dropped. For a softer wish, use "Time of day" under "Nice to have", which only ranks.',
    keywords: ['avoid day', 'avoid days', 'no saturday', 'saturday', 'friday', 'monday', 'no class on', 'no classes on', 'earliest start', 'latest end', 'early class', 'early classes', 'late class', '7am', '7 am', 'free day', 'day off', 'morning', 'afternoon'], pages: ['/courses'] },
  { id: 'teachers', question: 'How do I avoid or prefer a teacher?',
    answer: 'In Preferences, the Instructors card lists the teachers of your selected courses (select courses first). "Avoid these instructors" drops every schedule with that teacher. "Preferred instructors" only ranks those schedules higher. Use the search box to find a name. Careful: if an avoided teacher has the only section of a course, no schedule can be made.',
    keywords: ['teacher', 'instructor', 'professor', 'prof', 'avoid teacher', 'avoid instructor', 'prefer teacher', 'preferred instructor', 'favorite teacher', 'bad teacher'], pages: ['/courses', '/build'], links: [{ label: 'Go to Courses', href: '/courses' }] },
  { id: 'gaps', question: 'How do I get fewer gaps or a lunch break?',
    answer: 'In Preferences under "Nice to have": "Fewer gaps between classes" favors back-to-back schedules, "Fewer school days" favors cramming classes into fewer days, and "A real lunch break" weighs lunch more. If you need a hard minimum break between classes, set "Min break" under "Must follow".',
    keywords: ['gap', 'gaps', 'lunch', 'vacant', 'min break', 'minimum break', 'back to back', 'back-to-back', 'free time', 'fewer days', 'school days', 'compact'], pages: ['/courses'] },
  { id: 'campus', question: 'What is the campus travel rule?',
    answer: 'USC has two campuses, Main and Talamban, about half an hour apart. USChed never builds a schedule with classes on different campuses on the same day closer than 45 minutes. "Schedule notes" also flags a tight trip if you meet one while building by hand.',
    keywords: ['campus', 'talamban', 'main campus', 'travel', 'commute', 'jeep', '45 minutes'] },
  { id: 'score', question: 'What does the score mean?',
    answer: 'Each schedule gets a score out of 100 from how well it fits your preferences and general comfort (compactness, breaks, campus changes and so on). Higher ranks first. The "Score breakdown" on the Schedules page shows the parts, and the notes under the calendar explain the trade-offs in plain words.',
    keywords: ['score', 'rank', 'ranked', 'ranking', 'rating', 'breakdown', 'best schedule', 'why ranked', 'insights'], pages: ['/schedules'], links: [{ label: 'Go to Schedules', href: '/schedules' }] },
  { id: 'more-like', question: 'What does "More like this" do?',
    answer: 'On the Schedules page, "More like this" finds other schedules that share sections with the one you are looking at, so you can explore close variations. "Back to all results" returns to your original list.',
    keywords: ['more like this', 'similar', 'variation', 'like this one', 'back to all results'], pages: ['/schedules'] },
  { id: 'save', question: 'How do I save a schedule?',
    answer: 'On the Schedules page, press Save on the schedule you like and give it a name. Pressing Saved again removes it. Saved schedules are kept on your account, so they are still there after you sign in again.',
    keywords: ['save', 'saving', 'keep schedule', 'favorite', 'bookmark', 'name schedule', 'name my schedule', 'name a schedule', 'name the schedule', 'rename', 'unsave'], pages: ['/schedules', '/build'], links: [{ label: 'See saved schedules', href: '/saved' }] },
  { id: 'saved-page', question: 'Where are my saved schedules?',
    answer: 'On the Saved page (top bar). Each saved schedule is a card with a small preview of your week. Click a card to open the whole schedule, where you can copy a share link, download a PNG, or remove it.',
    keywords: ['saved schedules', 'saved page', 'where saved', 'my schedules', 'saved', 'view saved', 'open saved', 'delete saved', 'remove saved'], pages: ['/saved'], links: [{ label: 'Go to Saved', href: '/saved' }] },
  { id: 'compare', question: 'How do I compare schedules?',
    answer: 'On the Schedules page, press the round button beside 2 to 4 schedules in the list, then press "Compare selected". You get a side-by-side table of their scores and stats.',
    keywords: ['compare', 'comparison', 'side by side', 'versus', 'difference between'], pages: ['/schedules'], links: [{ label: 'Go to Schedules', href: '/schedules' }] },
  { id: 'share', question: 'How do I share, print or download a schedule?',
    answer: 'On the Schedules page (or inside a saved schedule): "Copy link" makes a link anyone can open to see just that schedule, "PNG" downloads a picture of the week, and "Print" prints it.',
    keywords: ['share', 'link', 'copy link', 'print', 'download', 'png', 'image', 'picture', 'screenshot', 'send', 'export', 'pdf'], pages: ['/schedules', '/saved'] },
  { id: 'build', question: 'Can I build my own schedule?',
    answer: 'Yes. On the Build page, pick one section for each selected course. The week fills in as you choose, clashing sections are flagged, and you can save the result with a name. Select your courses on the Courses page first.',
    keywords: ['build', 'manual', 'by hand', 'myself', 'own schedule', 'custom', 'make my own', 'pick sections', 'choose sections', 'section'], pages: ['/build'], links: [{ label: 'Go to Build', href: '/build' }] },
  { id: 'build-clash', question: 'Why can\'t I save my built schedule?',
    answer: 'Two of your picked sections meet at the same time. The red box on the Build page says which ones. Pick a different section for one of them (sections that would clash are marked before you choose them), then save.',
    keywords: ['cannot save', 'cant save', 'save disabled', 'clash', 'overlap', 'same time', 'conflict', 'conflicts'], pages: ['/build'] },
  { id: 'prereq', question: 'Does USChed check prerequisites?',
    answer: 'It shows prerequisites and warns when one is not marked passed, but it does not block you. ISMIS does not tell USChed what you have passed, so mark those yourself under "Use my prospectus". Always confirm prerequisites in ISMIS before enrolling.',
    keywords: ['prerequisite', 'prerequisites', 'prereq', 'passed', 'requisite', 'standing', 'requirements'], pages: ['/courses'] },
  { id: 'enroll', question: 'Does USChed enroll me?',
    answer: 'No. USChed never enrolls, drops or changes anything in ISMIS. It only helps you plan. Take your chosen sections to the official ISMIS and enroll yourself, and check that slots are still open.',
    keywords: ['enroll', 'enrol', 'enrollment', 'enrolment', 'register', 'registration', 'drop', 'official', 'slots', 'open slots'] },
  { id: 'tour', question: 'Can I replay the tour?',
    answer: 'Sure. Press the button below to start the tour again.',
    keywords: ['tour', 'tutorial', 'walkthrough', 'walk me through', 'how to use this app', 'how to use usched', 'how does this work', 'how it works', 'getting started', 'onboarding', 'new here', 'replay'], action: 'tour' },
  { id: 'data', question: 'What data does USChed keep?',
    answer: 'USChed keeps your student ID number, the course catalog it fetched for you, a log of your searches, schedules you chose to save, and a record that you accepted the Terms. It never keeps your password. Section 6 of the Terms lists everything.',
    keywords: ['what data', 'privacy', 'delete my data', 'personal data', 'what do you store', 'tracking', 'rights'], links: [{ label: 'Read the Terms', href: '/terms' }] },
  { id: 'contact', question: 'How do I report a problem or contact someone?',
    answer: 'The contact details are at the end of the Terms. When you write, say which page you were on and what you pressed. A screenshot helps.',
    keywords: ['contact', 'report', 'bug', 'problem', 'broken', 'not working', 'feedback', 'suggestion', 'email', 'complain'], links: [{ label: 'Read the Terms', href: '/terms' }] },
]

const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'to', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'i', 'my', 'me', 'we', 'you', 'it', 'of', 'in', 'on', 'for', 'and', 'or', 'how', 'what', 'where', 'when', 'why', 'which', 'who', 'with', 'this', 'that', 'there', 'be', 'get', 'want', 'need', 'please', 'hi', 'hello', 'hey', 'just', 'about', 'if', 'so'])

/** Lowercase words, without punctuation, with simple plurals/-ing folded so "schedules" matches "schedule". */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 4 && w.endsWith('ing') ? w.slice(0, -3) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
}

const normalize = (text: string) => ` ${text.toLowerCase().replace(/['\u2019]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim()} `

function score(query: string, queryTokens: Set<string>, allTokens: Set<string>, entry: HelpEntry, page: string | null): number {
  const q = normalize(query)
  let s = 0
  for (const k of entry.keywords) {
    const words = tokens(k)
    const significant = words.filter((w) => !STOP.has(w))
    if (words.length > 1) {
      // A phrase counts when it appears as written or when all its words are in the question, in any order
      // ("why can't I save" still matches "cant save"). Longer phrases are more specific, so they score more.
      if (q.includes(normalize(k)) || (significant.length > 1 && significant.every((w) => allTokens.has(w)))) s += 2 + significant.length
    } else if (q.includes(normalize(k)) || queryTokens.has(words[0] ?? k)) {
      s += 2
    }
  }
  for (const w of tokens(entry.question)) if (!STOP.has(w) && queryTokens.has(w)) s += 1
  if (s > 0 && page && entry.pages?.includes(page)) s += 1.5
  return s
}

export interface HelpReply {
  text: string
  links?: HelpLink[]
  /** Questions the student can tap to ask next. */
  suggestions?: string[]
  action?: 'tour'
}

const MIN_SCORE = 2
const DEFAULT_SUGGESTIONS = ['How do I generate schedules?', 'What are preferences?', 'How do I save a schedule?', 'Where are my saved schedules?']

/** The best answer for a question, or a polite "not sure" with ideas. `page` (the current path) breaks ties. */
export function answerQuestion(question: string, page: string | null = null): HelpReply {
  const text = question.trim()
  const all = new Set(tokens(text))
  const qt = new Set([...all].filter((w) => !STOP.has(w)))

  if (/\b(my|the)?\s*password\s+(is|was)\b/i.test(text) || /\bpassword\s*[:=]/i.test(text)) {
    return { text: 'Please do not share your password with anyone, including here. If that was your real password, change it in ISMIS now. I cannot see anything you type into the sign-in page.' }
  }
  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i.test(text) && qt.size === 0) {
    return { text: 'Hi! I can help you use USChed. Pick a question below or type your own.', suggestions: DEFAULT_SUGGESTIONS }
  }
  if (/^(thanks|thank you|ty|ok|okay|got it|cool)\b/i.test(text) && qt.size <= 1) {
    return { text: 'You are welcome! Ask me anything else about USChed.' }
  }

  const ranked = ENTRIES.map((e) => ({ e, s: score(text, qt, all, e, page) })).sort((a, b) => b.s - a.s)
  const best = ranked[0]
  if (!best || best.s < MIN_SCORE) {
    return {
      text: 'I am not sure about that one. I only know how to use USChed, so try rephrasing, or pick one of these.',
      suggestions: DEFAULT_SUGGESTIONS,
    }
  }
  // Close runners-up are offered as follow-ups, so a slightly-off match is one tap from the right answer.
  const related = ranked.slice(1, 4).filter((r) => r.s >= MIN_SCORE && r.s >= best.s * 0.6).map((r) => r.e.question)
  return { text: best.e.answer, links: best.e.links, action: best.e.action, suggestions: related.length ? related : undefined }
}

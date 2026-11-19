import { describe, expect, it } from 'vitest'
import { answerQuestion, ENTRIES, tokens } from './helpBot'

const idOf = (q: string, page: string | null = null) => {
  const reply = answerQuestion(q, page)
  return ENTRIES.find((e) => e.answer === reply.text)?.id ?? (reply.text.startsWith('I am not sure') ? 'unsure' : 'other')
}

describe('answerQuestion: finds the right answer for how students actually ask', () => {
  const cases: [string, string][] = [
    ['how do i log in', 'signin'],
    ['what is my username', 'signin'],
    ['is my password stored?', 'password'],
    ['do you save my password', 'password'],
    ['why did it log me out', 'session'],
    ['my session expired', 'session'],
    ['how do i change the semester', 'term'],
    ['where do i pick 2nd sem', 'term'],
    ['how to use prospectus', 'prospectus'],
    ['add all my subjects for 2nd year', 'prospectus'],
    ['how do i add a course', 'fetch'],
    ['fetch courses from ismis', 'fetch'],
    ['search says no results', 'noresults'],
    ['too many results when i search', 'noresults'],
    ['where are my saved courses', 'saved-courses'],
    ['how do i clear saved courses', 'saved-courses'],
    ['how do i generate schedules', 'generate'],
    ['make a timetable for me', 'generate'],
    ['it says no valid schedule', 'noschedule'],
    ['why are there no schedules generated', 'noschedule'],
    ['what are preferences', 'preferences'],
    ['what is must follow', 'preferences'],
    ['i dont want classes on saturday', 'avoid-days'],
    ['how do i avoid early classes', 'avoid-days'],
    ['how do i avoid a teacher', 'teachers'],
    ['i want a specific professor', 'teachers'],
    ['how to get a lunch break', 'gaps'],
    ['fewer gaps between classes', 'gaps'],
    ['why 45 minutes between campuses', 'campus'],
    ['talamban main travel time', 'campus'],
    ['what does the score mean', 'score'],
    ['how are schedules ranked', 'score'],
    ['what is more like this', 'more-like'],
    ['how do i save a schedule', 'save'],
    ['can i name my schedule', 'save'],
    ['where are my saved schedules', 'saved-page'],
    ['how do i compare schedules', 'compare'],
    ['how to print my schedule', 'share'],
    ['download schedule as image', 'share'],
    ['copy link to share my schedule', 'share'],
    ['can i make my own schedule', 'build'],
    ['pick sections by hand', 'build'],
    ['do you check prerequisites', 'prereq'],
    ['does this enroll me automatically', 'enroll'],
    ['replay the tour', 'tour'],
    ['how to use this app', 'tour'],
    ['what data do you keep', 'data'],
    ['i found a bug', 'contact'],
    ['who made usched', 'creator'],
    ['who created this app', 'creator'],
    ['who is the developer', 'creator'],
    ['tell me about the creator', 'creator'],
    ['where can i see their portfolio', 'creator'],
    ['do they have instagram', 'creator'],
  ]
  it.each(cases)('%s -> %s', (q, id) => expect(idOf(q)).toBe(id))
})

describe('answerQuestion: edge cases', () => {
  it('says it is not sure about unrelated questions and offers suggestions', () => {
    const r = answerQuestion('what is the weather in cebu')
    expect(r.text).toMatch(/not sure/i)
    expect(r.suggestions?.length).toBeGreaterThan(0)
    expect(answerQuestion('').text).toMatch(/not sure/i)
  })

  it('warns when someone types their password', () => {
    expect(answerQuestion('my password is hunter2').text).toMatch(/do not share your password/i)
    expect(answerQuestion('password: abc123').text).toMatch(/change it in ISMIS/i)
  })

  it('greets and thanks', () => {
    expect(answerQuestion('hi').suggestions?.length).toBeGreaterThan(0)
    expect(answerQuestion('thanks!').text).toMatch(/welcome/i)
  })

  it('attaches links and the tour action where the entry has them', () => {
    expect(answerQuestion('how do i generate schedules').links?.[0].href).toBe('/courses')
    expect(answerQuestion('replay the tour').action).toBe('tour')
  })

  it('uses the current page to break ties', () => {
    // "section" alone is vague: on Build it points at building by hand.
    expect(idOf('how do i pick a section', '/build')).toBe('build')
  })

  it('offers near-miss answers as follow-up questions', () => {
    const r = answerQuestion('how do i compare and share schedules')
    expect(r.suggestions?.length ?? 0).toBeGreaterThan(0)
    expect(answerQuestion('what are preferences').suggestions ?? []).not.toContain('What are preferences?')
  })
})

describe('knowledge base', () => {
  it('has unique ids and every question answers with itself', () => {
    expect(new Set(ENTRIES.map((e) => e.id)).size).toBe(ENTRIES.length)
    for (const e of ENTRIES) expect(idOf(e.question), e.question).toBe(e.id)
  })

  it('only links to pages that exist, or to the creator\'s own sites', () => {
    const real = ['/courses', '/schedules', '/saved', '/build', '/terms', 'https://alfermercado.com', 'https://instagram.com/alfermercads']
    for (const e of ENTRIES) for (const l of e.links ?? []) expect(real, `${e.id} -> ${l.href}`).toContain(l.href)
  })

  it('credits the creator with their portfolio and Instagram', () => {
    const r = answerQuestion('who made usched')
    expect(r.text).toMatch(/Alfer Brent Mercado/)
    expect(r.text).toMatch(/IT student/)
    expect(r.links?.map((l) => l.href)).toEqual(['https://alfermercado.com', 'https://instagram.com/alfermercads'])
  })

  it('folds plurals and -ing so "schedules" matches "schedule"', () => {
    expect(tokens('Saving schedules')).toEqual(['sav', 'schedule'])
  })
})

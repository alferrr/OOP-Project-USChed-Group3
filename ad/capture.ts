// Phase A: drive the real USChed app and save screenshots of each UI state, plus where the cursor should go.
// Login happens here, in the same browser context, with no screenshots taken until sign-in has finished.
// (The sign-in handle lives in page memory only, so it cannot be saved to a storageState file and reused.)
import { config } from 'dotenv'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { chromium, type Page } from 'playwright'

config({ path: '../.env' })
const user = process.env.USCHED_USERNAME
const pass = process.env.USCHED_PASSWORD
if (!user || !pass) throw new Error('USCHED_USERNAME / USCHED_PASSWORD are not set in .env')

const BASE = process.env.USCHED_URL ?? 'http://localhost:3000'
const NAME = 'My ideal week'
rmSync('states', { recursive: true, force: true })
mkdirSync('states', { recursive: true })

const CLEAN_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display: none !important }
  button[aria-label="Open USChed help"], section[aria-label="USChed help"] { display: none !important }
  ::-webkit-scrollbar { display: none !important }
  * { caret-color: #0f6b3f }
`

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'no-preference' })
const page = await ctx.newPage()
await page.addInitScript((css) => {
  const add = () => { const s = document.createElement('style'); s.textContent = css; document.documentElement.appendChild(s) }
  if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add)
}, CLEAN_CSS)

const targets: Record<string, { x: number, y: number }> = {}
const shot = (name: string) => page.screenshot({ path: `states/${name}.png` })
const settle = (ms = 700) => page.waitForTimeout(ms)
async function aim(name: string, loc: ReturnType<Page['locator']>) {
  const b = (await loc.boundingBox())!
  targets[name] = { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }
}

// 1. The sign-in page, before anyone signs in (empty form).
await page.goto(`${BASE}/login`)
await page.locator('input[aria-label="ISMIS username"]').waitFor()
await page.addStyleTag({ content: CLEAN_CSS + `[role="status"] { display: none !important }` })
await settle(1200)
await shot('login')

// 2. Sign in OFF CAMERA: no screenshots until the courses page is up.
await page.getByLabel('ISMIS username').fill(user)
await page.getByLabel('ISMIS password').fill(pass)
await page.getByRole('button', { name: 'Log In' }).click()
const boxes = page.getByRole('dialog').getByRole('checkbox')
for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check()
await page.getByRole('button', { name: 'Accept and sign in' }).click()
await page.waitForURL('**/courses', { timeout: 90_000 })
await page.addStyleTag({ content: CLEAN_CSS })
await settle(2500)

// 3. Courses page: typing a course code.
await shot('courses_0')
const input = page.getByLabel('Course codes')
await aim('codes', input)
const word = 'CIS 2105'
for (let i = 1; i <= word.length; i++) {
  await input.pressSequentially(word[i - 1])
  await page.waitForTimeout(120)
  await shot(`type_${i}`)
}
await input.fill('')
await page.evaluate(() => window.scrollTo({ top: 420 }))
await settle(900)
await shot('courses_1')

// 4. Add four saved courses to the plan.
for (let i = 1; i <= 4; i++) {
  const add = page.getByRole('button', { name: 'Add' }).first()
  await aim(`add_${i}`, add)
  await add.click()
  await settle(700)
  await shot(`add_${i}`)
}

// 5. Preferences.
const prefsBtn = page.getByRole('button', { name: /Preferences/ })
await aim('prefs', prefsBtn)
await prefsBtn.click()
await settle(1200)
await shot('prefs_open')
const morning = page.getByRole('option', { name: 'Morning' }).or(page.getByText('Morning', { exact: true })).first()
await aim('morning', morning)
await morning.click()
const gaps = page.getByText('Fewer gaps between classes')
await aim('gaps', gaps)
await gaps.click()
await settle(500)
await shot('prefs_set')
const done = page.getByRole('button', { name: 'Done' })
await aim('done', done)
await done.click()
await settle(900)
await shot('plan_ready')
await aim('generate', page.getByRole('button', { name: 'Generate Schedules' }))

// 6. Generate.
await page.getByRole('button', { name: 'Generate Schedules' }).click()
await page.waitForURL('**/schedules', { timeout: 120_000 })
await page.getByText('Schedule #1').first().waitFor()
await settle(2500)
await shot('sch_top')
const save = page.getByRole('button', { name: 'Save', exact: true }).first()
await aim('save', save)
await page.evaluate(() => window.scrollTo({ top: 360 }))
await settle(900)
await shot('sch_cal')
await page.evaluate(() => window.scrollTo({ top: 0 }))
await settle(500)

// 7. Name it and save it.
await save.click()
await settle(900)
await shot('name_dialog')
const nameBox = page.getByLabel('Schedule name')
const saveName = page.getByRole('button', { name: 'Save schedule' })
await aim('save_name', saveName)
await nameBox.fill(NAME)
await settle(400)
await shot('name_typed')
await Promise.all([page.waitForResponse((r) => r.url().includes('saved-schedules') && r.request().method() === 'PUT', { timeout: 30_000 }), saveName.click()])
await settle(1200)
await aim('nav_saved', page.getByRole('link', { name: 'Saved', exact: true }))
await page.getByRole('link', { name: 'Saved', exact: true }).click()
await page.waitForURL('**/saved')
await page.addStyleTag({ content: `li:has(button[aria-label^="Open "]:not([aria-label="Open ${NAME}"])) { display: none !important }` })
await page.getByRole('button', { name: `Open ${NAME}` }).waitFor({ timeout: 15_000 })
await settle(1500)
await shot('saved_page')

// 8. Clean up: remove the demo schedule from the account so nothing is left behind.
for (let n = 0; n < 5 && await page.getByRole('button', { name: `Open ${NAME}` }).count(); n++) {
  await page.getByRole('button', { name: `Open ${NAME}` }).first().click()
  await settle(800)
  await page.getByRole('dialog').getByRole('button', { name: /remove/i }).first().click()
  await settle(900)
  const confirm = page.getByRole('dialog').getByRole('button', { name: /^(remove|delete|yes)/i })
  if (await confirm.count()) await confirm.last().click()
  await settle(900)
}
console.log('demo schedules left on the account:', await page.getByRole('button', { name: `Open ${NAME}` }).count())

writeFileSync('states/targets.json', JSON.stringify(targets, null, 1))
await browser.close()
console.log('captured', Object.keys(targets).length, 'targets')

// Removes the demo schedule ("My ideal week") that capture.ts saves, if one is left on the account.
import { config } from 'dotenv'
import { chromium } from 'playwright'
config({ path: '../.env' })
const NAME = 'My ideal week'
const b = await chromium.launch()
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.goto('http://localhost:3000/login')
await page.getByLabel('ISMIS username').fill(process.env.USCHED_USERNAME!)
await page.getByLabel('ISMIS password').fill(process.env.USCHED_PASSWORD!)
await page.getByRole('button', { name: 'Log In' }).click()
const boxes = page.getByRole('dialog').getByRole('checkbox')
for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check()
await page.getByRole('button', { name: 'Accept and sign in' }).click()
await page.waitForURL('**/courses', { timeout: 90_000 })
await page.getByRole('link', { name: 'Saved', exact: true }).click()
await page.waitForURL('**/saved')
await page.waitForTimeout(1500)
console.log('cards:', await page.locator('button[aria-label^="Open "]').evaluateAll(e => e.map(x => x.getAttribute('aria-label'))))
for (let n = 0; n < 5 && await page.getByRole('button', { name: `Open ${NAME}` }).count(); n++) {
  await page.getByRole('button', { name: `Open ${NAME}` }).first().click()
  await page.waitForTimeout(800)
  console.log('dialog buttons:', await page.getByRole('dialog').getByRole('button').allInnerTexts())
  await page.getByRole('dialog').getByRole('button', { name: /remove/i }).first().click()
  await page.waitForTimeout(1200)
}
console.log('left:', await page.getByRole('button', { name: `Open ${NAME}` }).count())
await b.close()

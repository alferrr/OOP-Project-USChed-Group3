// Phase B: lay out every frame of the ad at 30 fps from the captured UI states, and save them as PNGs.
// Usage: npx tsx render.ts            (16:9, 1920x1080 -> frames/)
//        npx tsx render.ts vertical   (9:16, 1080x1920 -> frames-v/)
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const vertical = process.argv[2] === 'vertical'
const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080, FPS = 30, DURATION = 20
const OUT = vertical ? 'frames-v' : 'frames'
const BEATS = [3, 5.6, 9.6, 15.3, 18, 20] // end time of beats 1..6

const names = readdirSync('states').filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', ''))
const targets = JSON.parse(readFileSync('states/targets.json', 'utf8'))
rmSync(OUT, { recursive: true, force: true })
BEATS.forEach((_, i) => mkdirSync(`${OUT}/beat-0${i + 1}`, { recursive: true }))

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage()
await page.goto(pathToFileURL(resolve('stage.html')).href + (vertical ? '?v=1' : ''))
await page.evaluate((d) => (window as any).init(d), { names, targets })

const counts = BEATS.map(() => 0)
for (let f = 0; f < FPS * DURATION; f++) {
  const t = f / FPS
  const beat = BEATS.findIndex((end) => t < end)
  counts[beat]++
  await page.evaluate((tt) => (window as any).render(tt), t)
  await page.screenshot({ path: `${OUT}/beat-0${beat + 1}/frame-${String(counts[beat]).padStart(5, '0')}.png` })
  if (f % 100 === 0) console.log('frame', f)
}
await browser.close()
console.log('beats (frames):', counts.join(', '))

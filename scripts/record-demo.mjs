/**
 * Records the readme GIF from playground/demo.html.
 *
 *   pnpm --filter playground dev      # in one shell
 *   node scripts/record-demo.mjs      # in another
 *
 * Produces docs/demo.gif. Everything is driven through real mouse input so the
 * hover lifts and the popover's own dismissal behaviour show up as they would
 * for a user.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const URL = process.env.DEMO_URL ?? 'http://localhost:5173/demo.html'
const OUT_DIR = 'docs'
const RAW_DIR = '.demo-raw'
// Wide enough that the nested surface has room beside the tray rather than
// flipping back over it.
const WIDTH = 940
const HEIGHT = 520

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms))

rmSync(RAW_DIR, { recursive: true, force: true })
mkdirSync(RAW_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  recordVideo: { dir: RAW_DIR, size: { width: WIDTH, height: HEIGHT } },
  colorScheme: 'light',
  reducedMotion: 'no-preference',
})

const page = await context.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await pause(900)

const trigger = page.locator('.vtcp-trigger')
const swatches = page.locator('.vtcp-tray__group [role="radio"]')

// Open the tray.
await trigger.click()
await pause(750)

// Drift across the swatches so the hover lift reads.
for (const index of [0, 2, 4]) {
  await swatches.nth(index).hover()
  await pause(420)
}

// Take one.
await swatches.nth(3).click()
await pause(900)

// Back in, and on to the full surface.
await trigger.click()
await pause(600)
await page.locator('.vtcp-swatch--custom').hover()
await pause(300)
await page.locator('.vtcp-swatch--custom').click()
await pause(800)

// Drag the hue band by hand.
const hue = page.locator('.vtcp-band--hue')
const box = await hue.boundingBox()
await page.mouse.move(box.x + box.width * 0.62, box.y + box.height / 2)
await page.mouse.down()
for (let step = 0; step <= 24; step++) {
  const t = 0.62 + (0.42 - 0.62) * (step / 24)
  await page.mouse.move(box.x + box.width * t, box.y + box.height / 2)
  await pause(28)
}
await page.mouse.up()
await pause(500)

// Walk the ladder, then keep one.
const shades = page.locator('.vtcp-shade')
for (const index of [4, 2]) {
  await shades.nth(index).hover()
  await pause(380)
}
await shades.nth(2).click()
await pause(600)
await page.locator('.vtcp-action--primary').click()
await pause(1000)

// Reopen: the mixed colour is now one tap away.
await trigger.click()
await pause(1200)

await context.close()
await browser.close()

const video = readdirSync(RAW_DIR).find(file => file.endsWith('.webm'))
if (!video) throw new Error('playwright produced no video')
const src = join(RAW_DIR, video)

// Two passes: a palette built from the whole clip, then the encode. One pass
// picks a palette per frame and the swatches shimmer.
const palette = join(RAW_DIR, 'palette.png')
const filters = `fps=18,scale=860:-1:flags=lanczos`

execFileSync('ffmpeg', [
  '-y', '-i', src, '-vf', `${filters},palettegen=stats_mode=diff`, palette,
], { stdio: 'inherit' })

execFileSync('ffmpeg', [
  '-y', '-i', src, '-i', palette,
  '-lavfi', `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  join(OUT_DIR, 'demo.gif'),
], { stdio: 'inherit' })

rmSync(RAW_DIR, { recursive: true, force: true })
console.log(`\nwrote ${join(OUT_DIR, 'demo.gif')}`)

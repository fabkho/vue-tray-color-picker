/**
 * Shoots the readme stills from playground/demo.html.
 *
 *   pnpm dev                # in one shell
 *   pnpm demo:shoot         # in another
 *
 * Writes docs/shots/*.png and a composed docs/flow.png.
 *
 * Stills rather than a recording, deliberately. `page.screenshot()` honours
 * deviceScaleFactor — unlike CDP's screencast, whose frames are always CSS
 * pixels — so these come out at 2x, lossless, and a fraction of the size a gif
 * of the same flow cost.
 */
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const URL = process.env.DEMO_URL ?? 'http://localhost:5173/demo.html'
const OUT_DIR = join('docs', 'shots')

/** 2x, so a shot is crisp on a retina display and can be shown at half size. */
const DPR = 2
const VIEWPORT = { width: 1400, height: 900 }
const PAD = 44

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()

async function session(colorScheme) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    colorScheme,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await pause(500)
  return { context, page }
}

async function boxOf(page, targets) {
  const boxes = (await Promise.all(
    targets.map(selector => page.locator(selector).first().boundingBox()),
  )).filter(Boolean)
  const left = Math.min(...boxes.map(box => box.x))
  const right = Math.max(...boxes.map(box => box.x + box.width))
  const top = Math.min(...boxes.map(box => box.y))
  const bottom = Math.max(...boxes.map(box => box.y + box.height))
  return { left, right, top, bottom }
}

/**
 * Clipped to the union of what matters plus a margin, rather than to one
 * element. A popover sits in the top layer and overhangs its trigger, so an
 * element-scoped shot cuts it; and a full-viewport shot is mostly empty stage.
 */
async function shoot(page, name, targets, pad = PAD) {
  const box = await boxOf(page, targets)
  await page.screenshot({
    path: join(OUT_DIR, `${name}.png`),
    clip: {
      x: Math.max(0, box.left - pad),
      y: Math.max(0, box.top - pad),
      width: Math.min(VIEWPORT.width, box.right - box.left + pad * 2),
      height: Math.min(VIEWPORT.height, box.bottom - box.top + pad * 2),
    },
  })
  return name
}

const CARD = '.card'
const TRIGGER = '.vtcp-trigger'
const TRAY = '.vtcp-tray'
const SURFACE = '.vtcp-surface'
const CUSTOM = '.vtcp-swatch--custom'

async function openTray(page) {
  await page.locator(TRIGGER).click()
  await page.waitForSelector(TRAY)
  await pause(450)
}

async function openSurface(page) {
  await page.locator(CUSTOM).click()
  await page.waitForSelector(SURFACE)
  await pause(450)
}

/**
 * Hides what sits behind the panel, for the shots that are about the panel. The
 * surface overhangs the card it belongs to, so even a tight clip catches a
 * sliver of card and half a swatch, which reads as a crop accident rather than
 * as context.
 *
 * The surface has to be un-hidden explicitly: its popover is a DOM descendant
 * of the tray, so hiding the tray inherits straight down onto the thing being
 * photographed. `visibility` is the one property where a descendant can opt
 * back in, which is exactly why it is used here rather than `display`.
 */
async function isolate(page, hidden) {
  await page.evaluate((hide) => {
    for (const selector of ['.card', '.vtcp-tray']) {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) element.style.visibility = hide ? 'hidden' : ''
    }
    const surface = document.querySelector('.vtcp-surface')
    if (surface instanceof HTMLElement) surface.style.visibility = hide ? 'visible' : ''
  }, hidden)
  await pause(150)
}

const written = []

// ─── Light ───

{
  const { context, page } = await session('light')

  written.push(await shoot(page, '01-closed', [CARD]))

  await openTray(page)
  written.push(await shoot(page, '02-tray', [CARD, TRAY]))

  /* Hovered, so the lift and its shadow are in the shot — it is most of what
     the tray's character is. */
  await page.locator('.vtcp-tray__group [role="radio"]').nth(2).hover()
  await pause(450)
  written.push(await shoot(page, '03-hover', [CARD, TRAY], 56))

  await openSurface(page)
  written.push(await shoot(page, '04-in-context', [CARD, TRAY, SURFACE]))

  await isolate(page, true)
  written.push(await shoot(page, '05-surface', [SURFACE], 36))

  /* The band close up: the frosted thumb carries a wash of the colour under it,
     which is invisible at page scale. */
  written.push(await shoot(page, '06-bands', ['.vtcp-surface__head'], 26))

  await page.locator('.vtcp-hex').fill('#7a8b99')
  await page.locator('.vtcp-surface__title').hover()
  await pause(350)
  written.push(await shoot(page, '07-off-ladder', [SURFACE], 36))

  await context.close()
}

// ─── Dark ───

{
  const { context, page } = await session('dark')
  await openTray(page)
  written.push(await shoot(page, '08-tray-dark', [CARD, TRAY]))
  await openSurface(page)
  await isolate(page, true)
  written.push(await shoot(page, '09-surface-dark', [SURFACE], 36))
  await context.close()
}

await browser.close()

/* No composite. Three states of different shapes forced to one height make the
   wide ones enormous, and the readme wants each shot next to the thing it
   illustrates rather than all of them stacked at the top. */
console.log(`wrote ${written.length} shots to ${OUT_DIR}`)

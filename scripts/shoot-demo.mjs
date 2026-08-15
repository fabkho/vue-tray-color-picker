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
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
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
  await page.goto(`${URL}?bare`, { waitUntil: 'networkidle' })
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
    /* Transparent, so a shot carries only the component and its shadow — no
       grey rectangle to sit awkwardly on a readme or inside the hero. */
    omitBackground: true,
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
const TRIGGER = '.row:nth-child(2) .vtcp-trigger'
const TRAY = '.vtcp-tray'
const SURFACE = '.vtcp-surface'
const CUSTOM = '.vtcp-swatch--custom'

async function openTray(page) {
  await page.locator(TRIGGER).first().click()
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

// ─── Hero ───

/**
 * Composed in HTML rather than with an image tool, so the presentation has real
 * shadows, a real gradient and real type. The stills are inlined as data URLs,
 * so this needs no server and no temporary files.
 *
 * Shadows are `filter: drop-shadow`, not `box-shadow`: the shots are
 * transparent, so the shadow has to follow the component's rounded shape rather
 * than a rectangle around the image.
 */
const inline = name =>
  `data:image/png;base64,${readFileSync(join(OUT_DIR, `${name}.png`)).toString('base64')}`

const CHROME = `
  * { box-sizing: border-box; margin: 0; }
  body {
    display: grid; place-items: center;
    font: 400 15px/1.4 -apple-system, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif;
    color: #1d1d1f;
    background:
      radial-gradient(120% 90% at 50% -20%, #fff 0%, rgb(255 255 255 / 0%) 60%),
      linear-gradient(168deg, #f5f5f7 0%, #ebecf0 100%);
  }
  img {
    display: block;
    filter:
      drop-shadow(0 2px 4px rgb(0 0 0 / 6%))
      drop-shadow(0 14px 30px rgb(0 0 0 / 10%))
      drop-shadow(0 40px 70px rgb(0 0 0 / 8%));
  }
  figure { display: grid; gap: 22px; justify-items: center; }
  figcaption { font-size: 15px; letter-spacing: -0.01em; color: #6e6e73; text-align: center; }
  figcaption b { display: block; font-weight: 590; color: #1d1d1f; letter-spacing: -0.015em; }
`

const HEROES = [
  {
    name: 'hero-1-trio',
    size: { width: 1600, height: 620 },
    css: `.stage { display: flex; align-items: flex-end; gap: 64px; }`,
    body: `<div class="stage">
      <figure><img src="${inline('01-closed')}" width="380">
        <figcaption><b>In a form</b>One control among others</figcaption></figure>
      <figure><img src="${inline('03-hover')}" width="470">
        <figcaption><b>The tray</b>Presets, one tap away</figcaption></figure>
      <figure><img src="${inline('05-surface')}" width="300">
        <figcaption><b>The picker</b>Hue, shades, greys, hex</figcaption></figure>
    </div>`,
  },
  {
    name: 'hero-2-duo',
    size: { width: 1500, height: 620 },
    css: `.stage { display: flex; align-items: center; gap: 96px; }`,
    body: `<div class="stage">
      <img src="${inline('03-hover')}" width="660">
      <img src="${inline('05-surface')}" width="360">
    </div>`,
  },
  {
    name: 'hero-3-layered',
    size: { width: 1500, height: 700 },
    /* Overlapped and scaled rather than lined up: depth does the work captions
       would otherwise have to. */
    css: `.stage { position: relative; width: 1180px; height: 520px; }
      .stage img { position: absolute; }
      .back  { left: 0;    top: 96px;  width: 400px; opacity: .96; }
      .mid   { left: 250px; top: 176px; width: 560px; }
      .front { right: 40px; top: 0;    width: 340px; }`,
    body: `<div class="stage">
      <img class="back" src="${inline('01-closed')}">
      <img class="mid" src="${inline('03-hover')}">
      <img class="front" src="${inline('05-surface')}">
    </div>`,
  },
  {
    name: 'hero-4-spotlight',
    size: { width: 1500, height: 760 },
    css: `.stage { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
        gap: 56px; }
      .side { display: grid; gap: 40px; justify-items: center; }
      .side img { width: 330px; }
      .hero-shot { width: 400px; }`,
    body: `<div class="stage">
      <div class="side"><img src="${inline('01-closed')}"></div>
      <img class="hero-shot" src="${inline('05-surface')}">
      <div class="side"><img src="${inline('03-hover')}"></div>
    </div>`,
  },
  {
    name: 'hero-5-schemes',
    size: { width: 1500, height: 620 },
    /* A ground that is light on one side and dark on the other, so each shot
       sits on the scheme it belongs to instead of one of them looking wrong. */
    css: `body { background: linear-gradient(100deg, #f5f5f7 0%, #eceef2 46%, #1c1c1e 54%, #101012 100%); }
      .stage { display: flex; align-items: center; gap: 110px; }
      figcaption { color: #6e6e73; }
      .dark figcaption, .dark figcaption b { color: #f5f5f7; }`,
    body: `<div class="stage">
      <figure><img src="${inline('03-hover')}" width="470">
        <figcaption><b>Light</b>Follows the host's colour-scheme</figcaption></figure>
      <figure class="dark"><img src="${inline('09-surface-dark')}" width="300">
        <figcaption><b>Dark</b>No class convention to adopt</figcaption></figure>
    </div>`,
  },
]

for (const hero of HEROES) {
  const context = await browser.newContext({
    viewport: hero.size,
    deviceScaleFactor: DPR,
    colorScheme: 'light',
  })
  const page = await context.newPage()
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>${CHROME}
     body { width: ${hero.size.width}px; height: ${hero.size.height}px; }
     ${hero.css}</style>${hero.body}`,
    { waitUntil: 'load' },
  )
  await pause(300)
  await page.screenshot({ path: join('docs', `${hero.name}.png`) })
  await context.close()
  written.push(hero.name)
}

await browser.close()

console.log(`wrote ${written.length} images to ${OUT_DIR} and docs/`)

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

async function session(colorScheme, container = 'settings') {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    colorScheme,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(`${URL}?bare&container=${container}`, { waitUntil: 'networkidle' })
  await pause(500)
  return { context, page }
}

async function boxOf(page, targets) {
  const boxes = (await Promise.all(
    targets.map(async (selector) => {
      const locator = page.locator(selector).first()
      return await locator.count() ? locator.boundingBox() : null
    }),
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

const CARD = '.panel, .preview, .strip'
const TRIGGER = '.vtcp-trigger'
const TRAY = '.vtcp-tray'
const SURFACE = '.vtcp-surface'
const CUSTOM = '.vtcp-swatch--custom'

async function openTray(page) {
  /* The last picker in the container: whatever the layout, the tray then opens
     into free space rather than onto the control below it. */
  await page.locator(TRIGGER).last().click()
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
    for (const selector of ['.panel', '.preview', '.strip', '.vtcp-tray']) {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) element.style.visibility = hide ? 'hidden' : ''
    }
    const surface = document.querySelector('.vtcp-surface')
    if (surface instanceof HTMLElement) surface.style.visibility = hide ? 'visible' : ''
  }, hidden)
  await pause(150)
}

const written = []

// ─── Container candidates ───

for (const container of ['settings', 'preview', 'strip']) {
  const { context, page } = await session('light', container)
  written.push(await shoot(page, `c-${container}-closed`, [CARD]))
  await openTray(page)
  written.push(await shoot(page, `c-${container}-tray`, [CARD, TRAY]))
  await context.close()
}

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

/* Straight out of the IHDR chunk. Both shots have to be drawn at one scale, or
   the same component appears at two sizes in the same picture — so the widths
   are derived from the files rather than guessed. */
function pngSize(name) {
  const header = readFileSync(join(OUT_DIR, `${name}.png`)).subarray(16, 24)
  return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) }
}

const SCALE = 0.44
const at = name => `width="${Math.round(pngSize(name).width * SCALE)}"`

const GRADIENT = `data:image/png;base64,${readFileSync(join('docs', 'assets', 'gradient.png')).toString('base64')}`

const CHROME = `
  * { box-sizing: border-box; margin: 0; }
  body {
    display: grid; place-items: center;
    font: 400 15px/1.4 -apple-system, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif;
    color: #1d1d1f;
    overflow: hidden;
  }
  /* The ground goes on its own layer so it can be positioned and flipped
     independently of the composition sitting on it. */
  .ground {
    position: fixed; inset: 0; z-index: -1;
    background-image: url("${GRADIENT}");
    background-size: cover;
  }
  img {
    display: block;
    filter:
      drop-shadow(0 2px 4px rgb(0 0 0 / 8%))
      drop-shadow(0 16px 34px rgb(0 0 0 / 14%))
      drop-shadow(0 46px 80px rgb(0 0 0 / 12%));
  }
  /* Aligned at the top: the two panels are the same height, so their tops and
     bottoms line up and only the tray overhangs — which is what a popover
     does. */
  .stage { display: flex; align-items: flex-start; gap: 92px; }
  figcaption { font-size: 15px; letter-spacing: -0.01em; color: #6e6e73; text-align: center; }
  figcaption b { display: block; font-weight: 590; color: #1d1d1f; letter-spacing: -0.015em; }
`

/* The whole gradient, not a crop of it. `cover` cut most of the supplied
   artwork away. A soft gradient has no hard edges to distort, so stretching it
   to the canvas keeps every part visible; the only cost is how far the shape is
   squashed. Flipped, so the light falls from above and the dark settles under
   the composition. */
const GROUND = `.ground { background-size: 100% 100%; transform: rotate(180deg); }`

/**
 * The plate: a frosted sheet under the pair, so they read as one object resting
 * on the ground rather than two cut-outs floating over it. Five variations of
 * the same idea, differing only in how present the sheet is.
 */
const plate = ({ fill, blur, rim, pad, shadow }) => `
  .plate {
    padding: ${pad};
    border-radius: 34px;
    background: rgb(255 255 255 / ${fill});
    backdrop-filter: blur(${blur}) saturate(140%);
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / ${rim}),
      ${shadow};
  }`

const CLEARER = plate({
  fill: '18%', blur: '44px', rim: '38%', pad: '62px 84px',
  shadow: '0 30px 70px rgb(0 0 0 / 10%)',
})

/* One hero per container candidate, all on the same chosen ground and plate, so
   the only thing changing between them is the thing being compared. */
const HEROES = ['settings', 'preview', 'strip'].map(container => ({
  name: `hero-${container}`,
  size: { width: 1600, height: 900 },
  css: `${GROUND}${CLEARER}`,
  body: `<div class="ground"></div><div class="plate">
    <div class="stage">
      <img src="${inline(`c-${container}-tray`)}" ${at(`c-${container}-tray`)}>
      <img src="${inline('05-surface')}" ${at('05-surface')}>
    </div>
  </div>`,
}))

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

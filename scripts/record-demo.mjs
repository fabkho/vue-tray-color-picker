/**
 * Records the readme demo from playground/demo.html.
 *
 *   pnpm dev                          # in one shell
 *   node scripts/record-demo.mjs      # in another
 *
 * Produces docs/demo.gif and docs/demo.mp4.
 *
 * The camera move is scripted rather than inferred. Auto-zoom tools have to
 * guess where a click landed by watching pixels; here every interaction is
 * driven by us, so the exact element and moment are already known and the
 * timeline is built from them directly.
 *
 * Everything is driven through real mouse input so the hover lifts and the
 * popover's own dismissal behave as they would for a user.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const URL = process.env.DEMO_URL ?? 'http://localhost:5173/demo.html'
const OUT_DIR = 'docs'
const RAW_DIR = '.demo-raw'

/* Recorded larger than it is shown: zooming in then samples close to 1:1
   instead of magnifying blur. */
const WIDTH = 1920
const HEIGHT = 1080
const FPS = 30
const GIF_WIDTH = 640
const GIF_FPS = 15

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

rmSync(RAW_DIR, { recursive: true, force: true })
mkdirSync(RAW_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  recordVideo: { dir: RAW_DIR, size: { width: WIDTH, height: HEIGHT } },
  colorScheme: 'light',
  reducedMotion: 'no-preference',
})

const page = await context.newPage()
/* Recording starts with the page, so the clock has to start here too. */
const started = Date.now()
const at = () => (Date.now() - started) / 1000

// ─── Camera ───

/** Keyframes of `{ t, z, cx, cy }` — zoom, and the point held in the centre. */
const camera = [{ t: 0, z: 1, cx: WIDTH / 2, cy: HEIGHT / 2 }]

/**
 * Aim at an element. Keyframes are pushed at the moment they are requested and
 * interpolated afterwards, so a move started before an interaction is already
 * settling as it happens.
 */
async function look(target, z = 1) {
  const locators = Array.isArray(target) ? target : [target]
  const boxes = (await Promise.all(locators.map(one => one.boundingBox()))).filter(Boolean)
  if (boxes.length === 0) return

  /* Framed on the union rather than a single element: once the tray is open the
     interesting thing is a group, and centring on one member pushes the rest
     out of shot. */
  const left = Math.min(...boxes.map(box => box.x))
  const right = Math.max(...boxes.map(box => box.x + box.width))
  const top = Math.min(...boxes.map(box => box.y))
  const bottom = Math.max(...boxes.map(box => box.y + box.height))

  camera.push({ t: at(), z, cx: (left + right) / 2, cy: (top + bottom) / 2 })
}

await page.goto(URL, { waitUntil: 'networkidle' })
await pause(700)

const card = page.locator('.card')
const trigger = page.locator('.vtcp-trigger')
const swatches = page.locator('.vtcp-tray__group [role="radio"]')

await look(card, 2.05)
await pause(500)

// Lead the camera onto the trigger, then open.
await look(trigger, 3)
await pause(550)
await trigger.click()
await pause(150)

// Widen to hold the whole tray as it bursts in.
const tray = page.locator('.vtcp-tray')
await look([card, tray], 1.95)
await pause(750)

for (const index of [0, 2, 4]) {
  await swatches.nth(index).hover()
  await pause(430)
}

await swatches.nth(3).click()
await look(card, 2.2)
await pause(850)

// Back in, and on to the full surface.
await look(trigger, 2.7)
await pause(400)
await trigger.click()
await pause(500)
const custom = page.locator('.vtcp-swatch--custom')
await look([card, tray], 1.95)
await custom.hover()
await pause(400)
await custom.click()
await pause(250)

const surface = page.locator('.vtcp-surface')
await look([tray, surface], 1.75)
await pause(700)

// Close in on the bands: the frosted thumb is the detail worth seeing.
const bands = page.locator('.vtcp-surface__bands')
await look(bands, 3.4)
await pause(400)

const hue = page.locator('.vtcp-band--hue')
const box = await hue.boundingBox()
await page.mouse.move(box.x + box.width * 0.62, box.y + box.height / 2)
await page.mouse.down()
for (let step = 0; step <= 26; step++) {
  const t = 0.62 + (0.42 - 0.62) * (step / 26)
  await page.mouse.move(box.x + box.width * t, box.y + box.height / 2)
  await pause(26)
}
await page.mouse.up()
await pause(450)

// Pull out to the ladder, take a rung, keep it.
const shades = page.locator('.vtcp-shade')
await look([surface], 2.6)
await pause(350)
for (const index of [4, 2]) {
  await shades.nth(index).hover()
  await pause(380)
}
await shades.nth(2).click()
await pause(500)
await look(surface, 2.2)
await pause(300)
await page.locator('.vtcp-action--primary').click()
// Reframe immediately: the surface is gone, and holding on where it was
// leaves a second of empty stage.
await look(card, 2.2)
await pause(900)

// Reopen: the mixed colour is now one tap away.
await look(card, 2.2)
await trigger.click()
await pause(200)
await look([card, tray], 1.95)
await pause(1300)

await look(card, 2.05)
await pause(600)

await context.close()
await browser.close()

// ─── Encode ───

const video = readdirSync(RAW_DIR).find(file => file.endsWith('.webm'))
if (!video) throw new Error('playwright produced no video')
const src = join(RAW_DIR, video)

/**
 * Build a per-frame ffmpeg expression from the keyframes.
 *
 * `crop` cannot do this: its width and height are evaluated once at filter
 * setup, so the window can move but never resize. `zoompan` re-evaluates
 * everything per frame, which is the whole reason it exists.
 *
 * Timeline is in output frames rather than seconds, because `on` is the one
 * clock zoompan exposes consistently across builds.
 */
function ramp(pick) {
  const frame = key => Math.round(key.t * FPS)
  let out = `${pick(camera[camera.length - 1])}`
  for (let i = camera.length - 2; i >= 0; i--) {
    const from = camera[i]
    const to = camera[i + 1]
    const span = Math.max(1, frame(to) - frame(from))
    const p = `clip((on-${frame(from)})/${span},0,1)`
    // Smoothstep: eases both ends, so the camera never starts or stops abruptly.
    const eased = `(${p}*${p}*(3-2*${p}))`
    out = `if(lt(on,${frame(to)}),(${pick(from)}+(${pick(to)}-${pick(from)})*${eased}),${out})`
  }
  return out
}

const zoom = ramp(key => key.z.toFixed(4))
const centreX = ramp(key => key.cx.toFixed(2))
const centreY = ramp(key => key.cy.toFixed(2))

/* zoompan's x/y are the top-left of the window in *input* coordinates, and the
   window is iw/zoom wide — not, as it first looks, a position in the scaled
   image. Multiplying by zoom instead of dividing pushes the window off the
   subject and the clamp then pins it to an edge. */
const zoompan = [
  `zoompan=z='${zoom}'`,
  `x='clip((${centreX})-iw/zoom/2,0,iw-iw/zoom)'`,
  `y='clip((${centreY})-ih/zoom/2,0,ih-ih/zoom)'`,
  `d=1:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
].join(':')

const mp4 = join(OUT_DIR, 'demo.mp4')
execFileSync('ffmpeg', [
  '-y', '-i', src,
  '-vf', zoompan,
  '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  mp4,
], { stdio: ['ignore', 'ignore', 'inherit'] })

/**
 * Two passes for the gif: a palette from the whole clip, then the encode. One
 * pass picks a palette per frame and the swatches shimmer.
 *
 * The camera move is expensive here. A gif compresses by storing only what
 * changed between frames, and a moving camera changes every pixel of every
 * frame — so the same clip costs several times what it would with the camera
 * locked. Hence the smaller width, lower frame rate and halved palette: the mp4
 * is the high-fidelity copy, and the gif only has to survive a readme.
 */
const palette = join(RAW_DIR, 'palette.png')
const gifFilters = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos`

execFileSync('ffmpeg', [
  '-y', '-i', mp4,
  '-vf', `${gifFilters},palettegen=max_colors=128:stats_mode=diff`,
  palette,
], { stdio: ['ignore', 'ignore', 'inherit'] })

execFileSync('ffmpeg', [
  '-y', '-i', mp4, '-i', palette,
  '-lavfi', `${gifFilters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
  join(OUT_DIR, 'demo.gif'),
], { stdio: ['ignore', 'ignore', 'inherit'] })

rmSync(RAW_DIR, { recursive: true, force: true })
console.log(`\nwrote ${mp4} and ${join(OUT_DIR, 'demo.gif')} (${camera.length} camera keys)`)

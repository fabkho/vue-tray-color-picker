/**
 * Records the readme demo from playground/demo.html.
 *
 *   pnpm dev                          # in one shell
 *   pnpm demo:record                  # in another
 *
 * Produces docs/demo.gif and docs/demo.mp4.
 *
 * Frames come from CDP's screencast, not Playwright's recordVideo. recordVideo
 * is a lossy VP8 encode at a modest bitrate — fine played back at 1:1, but the
 * camera crops into it, and cropping into a soft source only magnifies the
 * softness. The screencast hands over lossless PNGs at the device pixel ratio.
 *
 * The camera move is scripted rather than inferred: every interaction is ours,
 * so the element and the moment are already known.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const URL = process.env.DEMO_URL ?? 'http://localhost:5173/demo.html'
const OUT_DIR = 'docs'
const RAW_DIR = '.demo-raw'

/**
 * The screencast delivers frames in *CSS* pixels: deviceScaleFactor does not
 * affect their size, and maxWidth/maxHeight only cap, never upscale. So the way
 * to hand the camera more pixels is a bigger viewport, not a higher DPR — hence
 * a 2x viewport with the demo page's root font size doubled to match, which is
 * a true supersample rather than an upscale.
 */
const OUT = { width: 1180, height: 664 }
const SUPERSAMPLE = 2
const VIEWPORT = { width: OUT.width * SUPERSAMPLE, height: OUT.height * SUPERSAMPLE }

const FPS = 30
const GIF_WIDTH = 560
const GIF_FPS = 14

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

rmSync(RAW_DIR, { recursive: true, force: true })
mkdirSync(RAW_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: VIEWPORT,
  colorScheme: 'light',
  reducedMotion: 'no-preference',
})
const page = await context.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await pause(400)

// ─── Capture ───

const frames = []
const client = await context.newCDPSession(page)

client.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  frames.push({ data, t: metadata.timestamp })
  try {
    await client.send('Page.screencastFrameAck', { sessionId })
  }
  catch { /* session already gone; the run is over. */ }
})

await client.send('Page.startScreencast', {
  format: 'png',
  everyNthFrame: 1,
  maxWidth: VIEWPORT.width,
  maxHeight: VIEWPORT.height,
})

/* The capture clock is the first frame's timestamp, so the camera timeline has
   to be measured from the same moment rather than from wall-clock zero. */
let firstFrameAt = null
while (firstFrameAt === null) {
  await pause(20)
  if (frames.length > 0) firstFrameAt = frames[0].t
}
const at = () => (frames.length > 0 ? frames[frames.length - 1].t : firstFrameAt) - firstFrameAt

// ─── Camera ───

/**
 * Keyframes of `{ t, z, cx, cy }` in CSS pixels.
 *
 * Three shots, and nothing between them. Each one centres what is on screen and
 * pulls back just enough to hold it: the card, then the card with its tray, then
 * both with the surface open. Everything else — hovering the swatches, dragging
 * the band, picking a shade — happens with the camera still.
 */
const camera = []

async function boxOf(target) {
  const locators = Array.isArray(target) ? target : [target]
  const boxes = (await Promise.all(locators.map(one => one.boundingBox()))).filter(Boolean)
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map(box => box.x))
  const right = Math.max(...boxes.map(box => box.x + box.width))
  const top = Math.min(...boxes.map(box => box.y))
  const bottom = Math.max(...boxes.map(box => box.y + box.height))
  return { left, right, top, bottom, width: right - left, height: bottom - top }
}

/**
 * `fill` is how much of the frame the subject should occupy on its constraining
 * axis — derived rather than hard-coded, because a level that frames the tray
 * crops the surface, which is twice as tall.
 */
async function focusOn(target, fill, move = 0.75) {
  const box = await boxOf(target)
  if (!box) return

  /* Capped at the supersample factor: past it the window is smaller than the
     output and the camera is upscaling, which is what recording large was meant
     to avoid. The demo page is sized so the tightest shot lands on the cap. */
  const z = Math.max(1, Math.min(
    VIEWPORT.width * fill / box.width,
    VIEWPORT.height * fill / box.height,
    SUPERSAMPLE,
  ))

  /* Pin the current framing before moving, or the ramp interpolates across the
     whole gap since the last key and the camera never actually holds. */
  if (camera.length > 0) camera.push({ ...camera[camera.length - 1], t: at() })

  const shot = {
    z,
    cx: (box.left + box.right) / 2,
    cy: (box.top + box.bottom) / 2,
  }
  if (process.env.DEMO_DEBUG) {
    console.log(`shot ${Math.round(box.width)}x${Math.round(box.height)} z=${z.toFixed(2)} centre=${Math.round(shot.cx)},${Math.round(shot.cy)}`)
  }
  camera.push({ t: at() + move, ...shot })
}

/** Moves the pointer. The camera is not told, and does not care. */
async function pointAt(target) {
  const box = await boxOf(target)
  if (!box) return
  await page.mouse.move((box.left + box.right) / 2, (box.top + box.bottom) / 2)
}

async function clickAt(target) {
  await pointAt(target)
  await pause(320)
  await page.mouse.down()
  await page.mouse.up()
}

const card = page.locator('.card')
const trigger = page.locator('.vtcp-trigger')
const tray = page.locator('.vtcp-tray')
const swatches = page.locator('.vtcp-tray__group [role="radio"]')
const custom = page.locator('.vtcp-swatch--custom')
const surface = page.locator('.vtcp-surface')

// ─── Shot 1: close on the card ───

await focusOn(card, 1)
await pause(650)

await clickAt(trigger)
await pause(200)

// ─── Shot 2: out a little, to hold the tray ───

await focusOn([card, tray], 0.8)
await pause(650)

/* Four swatches, spread across whatever the tray happens to hold, so the lift
   reads without turning into a tour. */
const count = await swatches.count()
for (let step = 0; step < 4; step++) {
  await pointAt(swatches.nth(Math.round(step * (count - 1) / 3)))
  await pause(480)
}

await clickAt(custom)
await pause(450)

// ─── Shot 3: out again, so the open surface fits ───

await focusOn([card, tray, surface], 0.86)
await pause(700)

const hue = page.locator('.vtcp-band--hue')
const band = await hue.boundingBox()
await page.mouse.move(band.x + band.width * 0.62, band.y + band.height / 2)
await page.mouse.down()
for (let step = 0; step <= 26; step++) {
  const fraction = 0.62 + (0.42 - 0.62) * (step / 26)
  await page.mouse.move(band.x + band.width * fraction, band.y + band.height / 2)
  await pause(26)
}
await page.mouse.up()
await pause(450)

const shades = page.locator('.vtcp-shade')
for (const index of [4, 2]) {
  await pointAt(shades.nth(index))
  await pause(400)
}
await page.mouse.down()
await page.mouse.up()
await pause(500)

await clickAt(page.locator('.vtcp-action--primary'))
await pause(800)

/* The payoff, at the framing we are already in: the mixed colour is now sitting
   in the tray. Reopening costs no camera move because shot 3 still holds it. */
await clickAt(trigger)
await pause(1600)

await client.send('Page.stopScreencast')
await pause(200)
await context.close()
await browser.close()

if (frames.length === 0) throw new Error('screencast produced no frames')

// ─── Assemble ───

/* The screencast only emits on change, so a held shot produces almost nothing.
   The concat demuxer takes each frame with the duration it was actually on
   screen, reconstructing the timing exactly without writing duplicates. */
const list = []
frames.forEach((frame, index) => {
  const name = `f${String(index).padStart(5, '0')}.png`
  writeFileSync(join(RAW_DIR, name), Buffer.from(frame.data, 'base64'))
  const next = frames[index + 1]
  const seconds = next ? next.t - frame.t : 1 / FPS
  list.push(`file '${name}'`, `duration ${Math.max(1 / 120, seconds).toFixed(4)}`)
})
list.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.png'`)
writeFileSync(join(RAW_DIR, 'frames.txt'), `${list.join('\n')}\n`)

// ─── Camera expression ───

/**
 * `crop` cannot do this: its width and height are evaluated once at filter
 * setup, so the window can move but never resize. `zoompan` re-evaluates per
 * frame, which is the whole reason it exists.
 *
 * The timeline is in output frames, because `on` is the one clock zoompan
 * exposes consistently across builds.
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

/* Camera coordinates and frames are both in CSS pixels — no conversion. */
const zoom = ramp(key => key.z.toFixed(4))
const centreX = ramp(key => key.cx.toFixed(2))
const centreY = ramp(key => key.cy.toFixed(2))

/* zoompan's x/y are the top-left of the window in *input* coordinates, and the
   window is iw/zoom wide — not, as it first reads, a position in the scaled
   image. Multiplying by zoom instead of dividing pushes the window off the
   subject, and the clamp then pins it to an edge. */
const zoompan = [
  `zoompan=z='${zoom}'`,
  `x='clip((${centreX})-iw/zoom/2,0,iw-iw/zoom)'`,
  `y='clip((${centreY})-ih/zoom/2,0,ih-ih/zoom)'`,
  `d=1:s=${VIEWPORT.width}x${VIEWPORT.height}:fps=${FPS}`,
].join(':')

/* Cropped at full capture size and only then scaled down. zoompan rounds its
   window origin to whole pixels, and at 2x that rounding is half an output
   pixel — the difference between a steady frame and a visible shimmer. */
const chain = `${zoompan},scale=${OUT.width}:${OUT.height}:flags=lanczos`

const mp4 = join(OUT_DIR, 'demo.mp4')
execFileSync('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0', '-i', join(RAW_DIR, 'frames.txt'),
  '-vf', chain, '-r', String(FPS),
  '-c:v', 'libx264', '-crf', '17', '-preset', 'slow',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  mp4,
], { stdio: ['ignore', 'ignore', 'inherit'] })

/* Two passes for the gif: a palette from the whole clip, then the encode. One
   pass picks a palette per frame and the swatches shimmer. */
const palette = join(RAW_DIR, 'palette.png')
const gifFilters = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos`

execFileSync('ffmpeg', [
  '-y', '-i', mp4,
  '-vf', `${gifFilters},palettegen=max_colors=160:stats_mode=diff`,
  palette,
], { stdio: ['ignore', 'ignore', 'inherit'] })

execFileSync('ffmpeg', [
  '-y', '-i', mp4, '-i', palette,
  '-lavfi', `${gifFilters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
  join(OUT_DIR, 'demo.gif'),
], { stdio: ['ignore', 'ignore', 'inherit'] })

rmSync(RAW_DIR, { recursive: true, force: true })
console.log(`\nwrote ${mp4} and ${join(OUT_DIR, 'demo.gif')}`)
console.log(`${frames.length} captured frames, ${camera.length} camera keys`)

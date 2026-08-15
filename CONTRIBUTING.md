# Contributing

```sh
pnpm install
pnpm exec playwright install chromium   # once, for the browser tier
pnpm dev                                # playground at :5173
```

## Scripts

| | |
| --- | --- |
| `pnpm build` | Vite library mode → `dist/`, with declarations |
| `pnpm dev` | the playground, aliased at source so edits show without a rebuild |
| `pnpm test` | unit tier (node) — the colour maths |
| `pnpm test:browser` | browser tier (Chromium) — everything with a DOM |
| `pnpm test:all` | both |
| `pnpm typecheck` | `vue-tsc --noEmit` |
| `pnpm lint` / `lint:fix` | ESLint |

## Layout

```
src/
  color.ts          pure colour maths — no Vue import, fully exported
  suggestions.ts    the default palette (separate because a defineProps
                    default is hoisted out of setup() and cannot reference
                    a locally declared value)
  labels.ts         every user-facing string, so no i18n runtime is imported
  recents.ts        per-key colour history; reads storage after mount, never
                    during setup, so SSR and hydration agree
  ColorSurface.vue  the picker panel — hue, shades, hex. No floating layer.
  ColorPopover.vue  Popover API + positioning. The swap-out point.
  ColorPicker.vue   the assembled component most consumers import
  style.css         the theming contract and all component CSS
tests/
  unit/             node — colour maths
  browser/          Chromium — everything else
playground/         development surface, seeded with the awkward cases
```

## Testing

Two tiers, and the split is not arbitrary. `color.ts` is pure and belongs in
node. Everything else — pointer input, popover dismissal, focus return, computed
styles, hydration — is untestable in a simulated DOM, and the browser tier
exists for exactly that.

Three things learned the hard way, all of which produced green tests that
proved nothing:

- **The browser tier needs `style.css`** (it is imported in `tests/browser/setup.ts`).
  Without it the UA's default `[popover]` centring wins and every geometry
  assertion measures the wrong box.
- **Light dismiss and Escape ignore synthetic events.** Use `userEvent` from
  `@vitest/browser/context`, or the popover simply will not close.
- **An assertion that something did not happen is worth exactly what its
  detector is worth.** The hydration suite keeps a negative control — a
  component that deliberately mismatches — because the first version watched
  the wrong console method and passed unconditionally.

The playground is seeded with awkward inputs rather than a happy path: off-ladder
colours, a CSS-variable default, pickers sharing and not sharing a recents key.
A demo that only shows one picker on a white background tells you nothing.

## The demo

`pnpm demo:record` drives `playground/demo.html` with Playwright and writes
`docs/demo.gif` and `docs/demo.mp4`.

The camera move is scripted, not inferred. Auto-zoom recorders have to guess
where a click landed by watching pixels; here every interaction is ours, so the
element and the moment are already known.

It follows the cursor rather than cutting between element framings, from two
inputs. A **subject** — the container currently worth looking at — sets the zoom
and anchors the shot. The **cursor** then pulls the frame around within it, by
`focusOn(target, fill, follow)`'s follow weight: high where moving across the
thing is the point (panning the tray), low where the shot is a composition, so
arriving somewhere centres it instead of being dragged to wherever the pointer
was left.

How far the cursor may drag the frame is the difference between the window and
the subject. When the subject is smaller, that is the slack left over, so it can
never be pushed out of shot; when it is larger, it is how far the window can
travel inside it, so the camera pans across rather than locking to the middle.

Things that cost time to find, in rough order of how much:

- **Frames come from CDP's screencast, not `recordVideo`.** `recordVideo` is a
  lossy VP8 encode; at 1:1 it looks fine, but the camera crops into it and
  cropping a soft source only magnifies the softness.
- **Screencast frames are in CSS pixels.** `deviceScaleFactor` does not change
  their size and `maxWidth`/`maxHeight` only cap, never upscale. Supersampling
  means a bigger *viewport*, not a higher DPR — and zoom past the supersample
  factor is upscaling again, so it is capped there and the demo page is sized so
  the tightest shot lands on the cap.
- **`rem` resolves against the root element.** Scaling the demo by setting
  `font-size` on the stage does nothing — every `rem` in the component stays at
  the browser default. It has to go on `html`.
- **Keyframes come in pairs.** The ramp interpolates between consecutive keys,
  so two keys far apart mean the camera drifts for the whole gap. A deliberate
  move pins the current framing first. Without that the camera never stops,
  which reads as a wobble — and it multiplies the gif, because gifs store what
  changed between frames and a moving camera changes all of them.
- **Zoom is derived from the subject**, as the fraction of the frame it should
  fill. A level that frames the tray crops the surface, which is half as wide
  and twice as tall.
- **Read a popover's box after it has been positioned**, and expect it where the
  layout actually puts it. The surface flips above the tray when there is no
  room below, so centring on it alone runs off the viewport edge and the clamp
  shoves it into a corner; it is framed together with the tray instead.

Two ffmpeg notes: `crop` cannot do this at all, because its width and height are
evaluated once at filter setup, so its window can move but never resize. And
`zoompan`'s `x`/`y` are in *input* coordinates with a window `iw/zoom` wide —
it reads like a position in the scaled image, and multiplying by the zoom
instead of dividing puts the window nowhere near the subject.

`DEMO_DEBUG=1 pnpm demo:record` prints each shot's box, zoom and centre, which
is the fastest way to tell a framing bug from a layout one.

## Commits and releases

Conventional commits, enforced by commitlint. `pre-commit` runs lint and
typecheck. Releases are automated by release-please: merge to `main`, and it
opens or updates a release PR; merging that publishes.

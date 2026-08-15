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
element and the moment are already known and the timeline is built from them —
`look(target, zoom)` pushes a keyframe, and the keyframes become an ffmpeg
`zoompan` expression.

Three things that cost time to find:

- **`zoompan`, not `crop`.** `crop` evaluates its width and height once at
  filter setup, so its window can move but never resize.
- **`zoompan`'s `x`/`y` are in input coordinates**, with a window `iw/zoom`
  wide. It reads like a position in the scaled image; multiply by the zoom
  instead of dividing and the clamp pins everything to an edge.
- **A moving camera is expensive in a gif.** Gifs compress by storing what
  changed between frames, and a camera move changes every pixel of every frame.
  The same clip costs several times what it would with the camera locked, which
  is why the gif is smaller and coarser than the mp4.

Frame the union of what matters rather than a single element: once the tray is
open the subject is a group, and centring on one member pushes the rest out of
shot.

## Commits and releases

Conventional commits, enforced by commitlint. `pre-commit` runs lint and
typecheck. Releases are automated by release-please: merge to `main`, and it
opens or updates a release PR; merging that publishes.

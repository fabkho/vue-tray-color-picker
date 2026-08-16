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

## The screenshots

`pnpm demo:shoot` drives `playground/demo.html` with Playwright and writes
`docs/shots/*.png`.

Stills, not a recording. A recording of this flow went through several rounds —
scripted camera moves, cursor following, `zoompan` — and the honest outcome was
that every version was worse than a handful of well-cropped stills, at ten times
the file size. If it ever comes back, the reasons it was hard are in the git
history of `scripts/`.

What matters here:

- **`page.screenshot()` honours `deviceScaleFactor`.** CDP's screencast does
  not — its frames are always CSS pixels regardless of DPR — which is why a
  recording of this page could never be as sharp as a shot of it.
- **Clip to the union of what matters**, not to one element. A popover lives in
  the top layer and overhangs its trigger, so an element-scoped shot cuts it,
  while a full-viewport shot is mostly empty stage.
- **Isolating the panel needs `visibility`, not `display`.** The surface's
  popover is a DOM descendant of the tray, so hiding the tray inherits straight
  down onto the thing being photographed; `visibility` is the one property a
  descendant can opt back out of.
- **Shoot with `reducedMotion: 'reduce'`**, so nothing is caught mid-transition.
- **The demo page needs its own `box-sizing` reset.** Without one a `height` is
  the content box, and padding plus border land on top — which is how a panel
  asked for the surface's height came out fifty pixels taller than it.
- **Panels are matched by construction, not by scaling.** The settings panel is
  given the surface's height and its rows share what is left (`min-height: 0`,
  or a flex item refuses to shrink below its content); the hero then draws both
  shots at one scale taken from their real pixel sizes. Scaling the images to
  match would show the same component at two sizes in one picture.
- **`?bare` plus `omitBackground` gives a transparent shot.** The component
  keeps its own shadow and floats on whatever it is placed on, rather than
  arriving with a grey rectangle that reads as a card inside a card.
- **The hero is composed in HTML, not with an image tool**, so it gets real
  shadows, a real gradient and real type. The stills go in as data URLs, so it
  needs no server and no temporary files. Its shadow is a `filter:
  drop-shadow`, not `box-shadow` — the images are transparent, so the shadow
  has to follow the component's rounded shape rather than a box around it.

The shots are placed in the readme next to what they illustrate rather than
collected at the top, which is also why there is no composite strip: three
states of different shapes forced to a common height makes the wide ones
enormous.

## The demo site

The playground is published to GitHub Pages on every push to `main`, from
`.github/workflows/pages.yml`.

- **`base` comes from `PAGES_BASE`.** A project page is served from `/<repo>/`,
  not the domain root, so asset URLs need the prefix — and an absolute path is
  the worst kind of bug to have, because it works locally and 404s only once
  published.
- **`demo.html` has to be named in `rollupOptions.input`.** Vite only discovers
  `index.html` on its own, and the staging page the stills are shot from would
  silently not be built.

## Commits and releases

Conventional commits, enforced by commitlint. `pre-commit` runs lint and
typecheck. Releases are automated by release-please: merge to `main`, and it
opens or updates a release PR; merging that publishes.

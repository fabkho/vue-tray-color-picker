# vue-tray-color-picker

[![CI](https://github.com/fabkho/vue-tray-color-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/fabkho/vue-tray-color-picker/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/vue-tray-color-picker?colorA=18181b&colorB=4fc08d)](https://www.npmjs.com/package/vue-tray-color-picker)
[![license](https://img.shields.io/npm/l/vue-tray-color-picker?colorA=18181b&colorB=4fc08d)](./LICENSE)

Tap a swatch and the presets burst out of it. Behind the `+`, a hue-and-shade
picker where every reachable colour is one worth shipping.

**[Try it →](https://fabkho.github.io/vue-tray-color-picker/)**

![Three states side by side: a resting swatch in a form row, the tray open with a swatch lifted, and the full picker](./docs/hero.png)

## Install

```sh
npm i vue-tray-color-picker
```

```ts
import { ColorPicker } from 'vue-tray-color-picker'
import 'vue-tray-color-picker/style.css'
```

The stylesheet is a separate import — nothing is injected, so load order stays
yours.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ColorPicker } from 'vue-tray-color-picker'

const color = ref<string | null>('#1bc98e')
</script>

<template>
  <ColorPicker v-model="color" />
</template>
```

## The ladder

Hue, a three-step saturation scale, five lightness rungs.

- `range="identity"` (default) — no greys, no hex. Every rung works as a label
  or a chart series.
- `range="full"` — greyscale rung, hex entry, rungs reaching near-black and
  near-white.

The ring marks the rung the value **is**, compared exactly. Open on something
off the ladder and nothing is ringed.

![A muted slate typed into the hex field, with no shade ringed](./docs/shots/07-off-ladder.png)

Opening never rewrites your value: save an untouched picker and you get back
what you passed in, byte for byte.

No alpha channel — hex in, hex out.

## Your own container

`ColorSurface` renders anywhere:

```vue
<MyDropdown>
  <ColorSurface v-model="color" range="full" @close="close" />
</MyDropdown>
```

A floating layer ships so `ColorPicker` works unconfigured; nothing depends on it.

## Theming

Every value resolves `--vtcp-*`, then `--ui-*`, then a literal default.

```css
:root {
  --vtcp-radius: 0.25rem;
  --vtcp-swatch-size: 1.75rem;
}
```

| Property | Default |
| --- | --- |
| `--vtcp-surface` | `light-dark(#fff, #1e1e21)` |
| `--vtcp-text` | `light-dark(#18181b, #e4e4e7)` |
| `--vtcp-text-muted` | `light-dark(#71717a, #a1a1aa)` |
| `--vtcp-border` | `light-dark(rgb(0 0 0 / 10%), rgb(255 255 255 / 12%))` |
| `--vtcp-shadow` | `0 3px 6px rgb(0 0 0 / 15%)` |
| `--vtcp-radius` | `0.75rem` |
| `--vtcp-duration` | `340ms` |
| `--vtcp-ease` | a sampled spring, one soft overshoot |
| `--vtcp-swatch-size` | `2.25rem` |
| `--vtcp-gap` | `0.625rem` |
| `--vtcp-surface-muted` | `light-dark(#f4f4f6, #2a2a2e)` |
| `--vtcp-primary` / `--vtcp-primary-text` | `light-dark(#18181b, #e4e4e7)` / inverted |
| `--vtcp-tray-gap` / `--vtcp-tray-padding` | `0.5rem` / `0.375rem` |
| `--vtcp-glass-blur` | `20px` — `0` for a flat pill |
| `--vtcp-glass-surface` | `light-dark(rgb(255 255 255 / 92%), rgb(30 30 30 / 92%))` |
| `--vtcp-glass-border` | `light-dark(rgb(210 214 222 / 40%), rgb(255 255 255 / 8%))` |
| `--vtcp-glass-shadow` | a soft ambient shadow |
| `--vtcp-burst-step` | `-3.25rem` — how far the swatches fly in from |
| `--vtcp-band-height` | `1.25rem` |
| `--vtcp-thumb-width` / `--vtcp-thumb-height` | `1.0625rem` / `1.75rem` |
| `--vtcp-thumb-radius` | `0.6rem` |
| `--vtcp-thumb-blur` | `3px` |
| `--vtcp-thumb-fill` | `rgb(255 255 255 / 10%)` |

Dark mode is `light-dark()` against the **inherited** `color-scheme`, so declare
it above the picker or it resolves light:

```css
:root { color-scheme: light dark; }
```

![The picker in dark mode](./docs/shots/09-surface-dark.png)

`prefers-reduced-motion` removes the burst.

## API

### `<ColorPicker>`

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `modelValue` | `string \| null` | `null` | Hex, or null for unset |
| `suggestions` | `ColorSuggestion[]` | six presets | One-tap swatches |
| `defaultValue` | `string` | `#2b6af8` | Shown while unset; may be a CSS variable |
| `range` | `'identity' \| 'full'` | `'identity'` | |
| `commit` | `'confirm' \| 'immediate'` | `'confirm'` | `immediate` drops the footer and writes as you move |
| `clearable` | `boolean` | `false` | Adds a swatch that unsets the value |
| `disabled` | `boolean` | `false` | |
| `placement` | `Placement` | `'bottom-start'` | |
| `recentKey` | `string \| null` | `'vtcp:recent'` | Scope per field; `null` disables persistence |
| `recentLimit` | `number` | `3` | |
| `labels` | `Partial<ColorPickerLabels>` | English | Every user-facing string |

Emits `update:modelValue` with a hex string, or `null` when cleared.

`ColorPickerProps` and `Placement` are exported, so a wrapper can extend the
prop shape without restating it.

### `<ColorSurface>`

The panel alone: `modelValue`, `range`, `commit`, `disabled`, `labels`,
`saveClass`, `cancelClass`. Emits `update:modelValue` and `close`.

Restyle the footer with `saveClass` / `cancelClass`, or replace it:

```vue
<ColorPicker v-model="color">
  <template #actions="{ save, cancel, value }">
    <MyButton @click="cancel">Discard</MyButton>
    <MyButton primary @click="save">Use {{ value }}</MyButton>
  </template>
</ColorPicker>
```

### `<ColorPopover>`

The bundled floating layer: `open` (v-model), `placement`, `gap`, `disabled`.
Slots `#trigger="{ open, toggle, triggerAttrs }"` and `#default="{ close }"`.

### Colour maths

`hexToHsl`, `hslToHex`, `isHex`, `expandHex`, `shadesFor`, `resolveAxes`,
`nearestStepIndex`, `lightnessSteps`, and the step tables — pure, exported,
usable without the components.

## Accessibility

Both swatch groups are radio groups: one tab stop, arrows move and select, Home
and End reach the ends. The bundled layer traps Tab, closes on Escape and
outside click, and returns focus to the trigger. Every swatch has a name.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licence

MIT

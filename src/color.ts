/**
 * The colour model, as plain functions. Everything the picker can express is
 * decided here — the components only move indices around.
 */

export interface Hsl {
  /** Degrees, 0-360. */
  h: number
  /** 0-1. */
  s: number
  /** 0-1. */
  l: number
}

/**
 * `identity` is for an entity's own colour: it stays in the legible middle, so
 * every reachable colour is usable as a label or a chart series. `full` is for
 * surface and theme colours, which need the extremes and the greyscale rung.
 */
export type ColorRange = 'identity' | 'full'

export const SATURATION_STEPS: readonly number[] = [0, 0.35, 0.72]

/** Outside `full`, saturation is pinned here — a muted identity colour reads as broken. */
export const VIVID_SATURATION_INDEX = 2

export const IDENTITY_LIGHTNESS_STEPS: readonly number[] = [0.32, 0.44, 0.56, 0.68, 0.8]
export const FULL_LIGHTNESS_STEPS: readonly number[] = [0.1, 0.3, 0.5, 0.72, 0.94]

export function lightnessSteps(range: ColorRange): readonly number[] {
  return range === 'full' ? FULL_LIGHTNESS_STEPS : IDENTITY_LIGHTNESS_STEPS
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Six-digit hex only. Shorthand is not "valid" — it is `expandHex`'s job. */
export function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

/** `#rgb` → `#rrggbb`. Returns null for anything that is neither form. */
export function expandHex(value: string): string | null {
  if (isHex(value)) return value.toLowerCase()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  if (!short) return null
  const [, r, g, b] = short as unknown as [string, string, string, string]
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp01(s)
  const light = clamp01(l)
  const a = sat * Math.min(light, 1 - light)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * value).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

export function hexToHsl(hex: string): Hsl | null {
  const expanded = expandHex(hex)
  if (!expanded) return null

  const r = parseInt(expanded.slice(1, 3), 16) / 255
  const g = parseInt(expanded.slice(3, 5), 16) / 255
  const b = parseInt(expanded.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min

  // Achromatic: hue and saturation are meaningless, so report a neutral rather
  // than dividing by zero.
  if (delta === 0) return { h: 0, s: 0, l }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4

  return { h: ((h * 60) % 360 + 360) % 360, s, l }
}

/** Index of the step closest to `value`. Ties go to the lower index. */
export function nearestStepIndex(steps: readonly number[], value: number): number {
  let best = 0
  for (let i = 1; i < steps.length; i++) {
    if (Math.abs(steps[i]! - value) < Math.abs(steps[best]! - value)) best = i
  }
  return best
}

/** The rungs of the ladder at a given hue and saturation. */
export function shadesFor(
  hue: number,
  saturationIndex: number,
  range: ColorRange,
): string[] {
  const saturation = SATURATION_STEPS[saturationIndex] ?? SATURATION_STEPS[VIVID_SATURATION_INDEX]!
  return lightnessSteps(range).map(step => hslToHex(hue, saturation, step))
}

export interface Axes {
  /** Degrees, rounded — the hue control is integer-valued. */
  hue: number
  saturationIndex: number
  lightnessIndex: number
}

/**
 * The axis positions that come closest to `hex`. Closest is not equal: the
 * ladder is a fixed grid, and outside `full` the saturation axis is pinned, so
 * most colours land near a rung rather than on one. Callers that need to know
 * whether it landed *on* one should compare `shadesFor(...)` against the value.
 */
export function resolveAxes(hex: string, range: ColorRange): Axes | null {
  const hsl = hexToHsl(hex)
  if (!hsl) return null
  return {
    // An achromatic colour carries no hue; leave the caller's hue where it is
    // by reporting 0 rather than a hue derived from rounding error.
    hue: Math.round(hsl.h),
    saturationIndex: range === 'full'
      ? nearestStepIndex(SATURATION_STEPS, hsl.s)
      : VIVID_SATURATION_INDEX,
    lightnessIndex: nearestStepIndex(lightnessSteps(range), hsl.l),
  }
}

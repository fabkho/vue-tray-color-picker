import './style.css'

export { default as ColorPicker } from './ColorPicker.vue'
export type { ColorPickerProps } from './ColorPicker.vue'
export { default as ColorPopover } from './ColorPopover.vue'
export type { ColorPopoverProps } from './ColorPopover.vue'
export { default as ColorSurface } from './ColorSurface.vue'
export type { ColorSurfaceProps } from './ColorSurface.vue'
export { useRecentColors } from './recents.js'

export { DEFAULT_SUGGESTIONS } from './suggestions.js'
export type { ColorSuggestion } from './suggestions.js'

/* Deliberately narrower than what `color.ts` exports. `resolveAxes` and `Axes`
   describe the surface's internal control state, `nearestStepIndex` is a generic
   numeric helper that only reads as colour maths from inside, and
   VIVID_SATURATION_INDEX is an index into a table whose shape is the thing most
   likely to change. Widening this later is additive; narrowing it is not. */
export {
  expandHex,
  FULL_LIGHTNESS_STEPS,
  hexToHsl,
  hslToHex,
  IDENTITY_LIGHTNESS_STEPS,
  isHex,
  lightnessSteps,
  SATURATION_STEPS,
  shadesFor,
} from './color.js'

export { DEFAULT_LABELS } from './labels.js'

export type { ColorRange, Hsl } from './color.js'
export type { ColorPickerLabels } from './labels.js'

/* The `placement` prop's type is Floating UI's, so without this a consumer
   cannot name it without depending on a package they never installed. */
export type { Placement } from '@floating-ui/dom'

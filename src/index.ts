import './style.css'

export { default as ColorPicker } from './ColorPicker.vue'
export type { ColorPickerProps } from './ColorPicker.vue'
export { default as ColorPopover } from './ColorPopover.vue'
export { default as ColorSurface } from './ColorSurface.vue'
export { useRecentColors } from './recents'

export { DEFAULT_SUGGESTIONS } from './suggestions'
export type { ColorSuggestion } from './suggestions'

export {
  expandHex,
  FULL_LIGHTNESS_STEPS,
  hexToHsl,
  hslToHex,
  IDENTITY_LIGHTNESS_STEPS,
  isHex,
  lightnessSteps,
  nearestStepIndex,
  resolveAxes,
  SATURATION_STEPS,
  shadesFor,
  VIVID_SATURATION_INDEX,
} from './color'

export { DEFAULT_LABELS } from './labels'

export type { Axes, ColorRange, Hsl } from './color'
export type { ColorPickerLabels } from './labels'

/* The `placement` prop's type is Floating UI's, so without this a consumer
   cannot name it without depending on a package they never installed. */
export type { Placement } from '@floating-ui/dom'

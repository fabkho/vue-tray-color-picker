/**
 * Every user-facing string, so the component imports no i18n runtime. Consumers
 * pass whatever their own solution produces; unset keys fall back to English.
 */
export interface ColorPickerLabels {
  title: string
  hue: string
  saturation: string
  shades: string
  hexValue: string
  save: string
  cancel: string
  close: string
  selectColor: string
  useDefault: string
  custom: string
}

export const DEFAULT_LABELS: ColorPickerLabels = {
  title: 'Custom',
  hue: 'Hue',
  saturation: 'Saturation',
  shades: 'Shades',
  hexValue: 'Hex value',
  save: 'Save',
  cancel: 'Cancel',
  close: 'Close',
  selectColor: 'Select colour',
  useDefault: 'Use default',
  custom: 'Custom colour',
}

/**
 * Always a fresh object — returning the shared `DEFAULT_LABELS` would let a
 * consumer who mutates the result change every other consumer's labels.
 *
 * `undefined` values are skipped rather than spread, because a plain spread
 * overwrites the default with `undefined` and the label renders empty. That is
 * the ordinary shape of an i18n lookup miss — `{ title: t('picker.title') }`
 * where the key is absent — and falling back to English beats rendering
 * nothing.
 */
export function withDefaults(
  labels: Partial<ColorPickerLabels> | undefined,
): ColorPickerLabels {
  const merged = { ...DEFAULT_LABELS }
  if (!labels) return merged
  for (const [key, value] of Object.entries(labels)) {
    if (value !== undefined) merged[key as keyof ColorPickerLabels] = value
  }
  return merged
}

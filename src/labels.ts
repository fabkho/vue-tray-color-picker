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

export function withDefaults(
  labels: Partial<ColorPickerLabels> | undefined,
): ColorPickerLabels {
  return labels ? { ...DEFAULT_LABELS, ...labels } : DEFAULT_LABELS
}

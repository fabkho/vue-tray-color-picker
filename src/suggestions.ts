export interface ColorSuggestion {
  value: string
  /** The accessible name — a bare hex is not something a screen-reader user can act on. */
  label: string
}

/**
 * The default tray. Lives here rather than in the component because a
 * `defineProps` default is hoisted out of `setup()` and cannot reference a
 * locally declared value.
 */
export const DEFAULT_SUGGESTIONS: readonly ColorSuggestion[] = [
  { value: '#2b6af8', label: 'Blue' },
  { value: '#1bc98e', label: 'Green' },
  { value: '#e2a04f', label: 'Amber' },
  { value: '#e64759', label: 'Red' },
  { value: '#8e5dca', label: 'Purple' },
  { value: '#d33e8a', label: 'Pink' },
]

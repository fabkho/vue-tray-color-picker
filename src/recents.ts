import { onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/**
 * Recently mixed colours, persisted per key so two fields on one page keep
 * separate histories. A null key disables persistence entirely, for contexts
 * where writing to storage is not acceptable.
 */
export function useRecentColors(
  key: MaybeRefOrGetter<string | null>,
  limit: MaybeRefOrGetter<number>,
) {
  const colors = ref<string[]>([])

  function read(storageKey: string | null): string[] {
    if (!storageKey || typeof localStorage === 'undefined') return []
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []
    }
    catch {
      // A corrupt or blocked store is not worth breaking the picker over.
      return []
    }
  }

  function write(storageKey: string | null, value: string[]) {
    if (!storageKey || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    }
    catch { /* quota or private mode — the picker still works, just forgets. */ }
  }

  /**
   * Deliberately not read during setup. There is no storage on the server, so
   * reading on the client's first render would disagree with the server's HTML
   * and trip hydration. Filling in after mount is a visible update, not a
   * mismatch.
   */
  onMounted(() => {
    colors.value = read(toValue(key))
  })

  watch(() => toValue(key), (next) => {
    colors.value = read(next)
  })

  function remember(color: string | null, isPreset: (value: string) => boolean) {
    if (!color || isPreset(color)) return
    const withoutDuplicate = colors.value.filter(
      recent => recent.toLowerCase() !== color.toLowerCase(),
    )
    colors.value = [color, ...withoutDuplicate].slice(0, Math.max(0, toValue(limit)))
    write(toValue(key), colors.value)
  }

  return { colors, remember }
}

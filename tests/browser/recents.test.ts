import type { MaybeRefOrGetter } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useRecentColors } from '../../src/recents'

/**
 * `useRecentColors` reads storage in `onMounted` — deliberately, to keep the
 * client's first render agreeing with the server's HTML — so it can only be
 * exercised inside a real component instance. Hence the browser project rather
 * than the unit one: this needs a genuine `localStorage` as much as a mounted
 * component.
 */
const KEY = 'vtcp:test'

let wrapper: VueWrapper | null = null

function run(key: MaybeRefOrGetter<string | null>, limit: MaybeRefOrGetter<number> = 3) {
  let api!: ReturnType<typeof useRecentColors>
  const Host = defineComponent({
    setup() {
      api = useRecentColors(key, limit)
      return () => h('div')
    },
  })
  wrapper = mount(Host)
  return api
}

/** The screening predicate the picker passes in; irrelevant to most cases. */
const nothingIsPreset = () => false

const stored = (key = KEY) => JSON.parse(localStorage.getItem(key) ?? 'null')

beforeEach(() => localStorage.clear())

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useRecentColors — reading', () => {
  it('starts empty and fills in from storage after mount', () => {
    localStorage.setItem(KEY, JSON.stringify(['#7a8b99', '#123456']))
    expect(run(KEY).colors.value).toEqual(['#7a8b99', '#123456'])
  })

  it('reads nothing when the key is null', () => {
    localStorage.setItem(KEY, JSON.stringify(['#7a8b99']))
    expect(run(null).colors.value).toEqual([])
  })

  it('survives a corrupt payload', () => {
    localStorage.setItem(KEY, '{not json')
    expect(run(KEY).colors.value).toEqual([])
  })

  it('survives a payload that is not an array', () => {
    localStorage.setItem(KEY, JSON.stringify({ '#7a8b99': true }))
    expect(run(KEY).colors.value).toEqual([])
  })

  it('drops entries that are not colours', () => {
    // Anything surviving this ends up in a `:key` and a custom property, so a
    // string is not a strong enough guarantee.
    localStorage.setItem(KEY, JSON.stringify([
      '#7a8b99', 42, null, 'red', 'var(--x)', '', { value: '#fff' }, '#abc',
    ]))
    expect(run(KEY).colors.value).toEqual(['#7a8b99', '#abc'])
  })

  it('survives a storage that throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => run(KEY)).not.toThrow()
  })

  it('survives a storage that throws on the property access itself', () => {
    /* Safari with cookies blocked throws SecurityError when `localStorage` is
       *reached for*, before any method is called — so a `typeof localStorage`
       guard evaluated outside the try throws in exactly the case it was
       written to survive.

       The real descriptor has to be captured and put back: `localStorage` is an
       own property of `window`, so deleting the override would leave the global
       missing entirely rather than uncovering an inherited accessor. */
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('blocked', 'SecurityError') },
    })
    try {
      expect(() => run(KEY)).not.toThrow()
      expect(() => run(KEY).remember('#7a8b99', nothingIsPreset)).not.toThrow()
    }
    finally {
      Object.defineProperty(window, 'localStorage', real)
    }
  })

  it('re-reads when the key changes', async () => {
    localStorage.setItem(KEY, JSON.stringify(['#7a8b99']))
    localStorage.setItem('vtcp:other', JSON.stringify(['#123456']))

    const key = ref<string | null>(KEY)
    const { colors } = run(() => key.value)
    expect(colors.value).toEqual(['#7a8b99'])

    key.value = 'vtcp:other'
    await nextTick()
    expect(colors.value).toEqual(['#123456'])
  })
})

describe('useRecentColors — remembering', () => {
  it('prepends, so the newest is nearest the tray', () => {
    const { colors, remember } = run(KEY)
    remember('#111111', nothingIsPreset)
    remember('#222222', nothingIsPreset)
    expect(colors.value).toEqual(['#222222', '#111111'])
  })

  it('moves a repeat to the front rather than duplicating it', () => {
    // Two entries with the same value would collide as `:key`s.
    const { colors, remember } = run(KEY)
    remember('#111111', nothingIsPreset)
    remember('#222222', nothingIsPreset)
    remember('#111111', nothingIsPreset)
    expect(colors.value).toEqual(['#111111', '#222222'])
  })

  it('treats casing as the same colour', () => {
    const { colors, remember } = run(KEY)
    remember('#7a8b99', nothingIsPreset)
    remember('#7A8B99', nothingIsPreset)
    expect(colors.value).toEqual(['#7A8B99'])
  })

  it('caps the history at the limit', () => {
    const { colors, remember } = run(KEY, 2)
    remember('#111111', nothingIsPreset)
    remember('#222222', nothingIsPreset)
    remember('#333333', nothingIsPreset)
    expect(colors.value).toEqual(['#333333', '#222222'])
  })

  it('keeps nothing at a limit of zero', () => {
    const { colors, remember } = run(KEY, 0)
    remember('#111111', nothingIsPreset)
    expect(colors.value).toEqual([])
  })

  it('ignores presets and empty values', () => {
    // A preset already has a swatch; remembering it would render two.
    const { colors, remember } = run(KEY)
    remember('#2b6af8', value => value === '#2b6af8')
    remember(null, nothingIsPreset)
    expect(colors.value).toEqual([])
  })

  it('persists what it remembers', () => {
    run(KEY).remember('#7a8b99', nothingIsPreset)
    expect(stored()).toEqual(['#7a8b99'])
  })

  it('holds the history in memory but writes nothing when the key is null', () => {
    const { colors, remember } = run(null)
    remember('#7a8b99', nothingIsPreset)
    expect(colors.value).toEqual(['#7a8b99'])
    expect(localStorage.length).toBe(0)
  })

  it('still remembers when the write is refused', () => {
    // Quota exhausted, or private mode. The picker forgets across reloads; it
    // does not break.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { colors, remember } = run(KEY)
    expect(() => remember('#7a8b99', nothingIsPreset)).not.toThrow()
    expect(colors.value).toEqual(['#7a8b99'])
  })
})

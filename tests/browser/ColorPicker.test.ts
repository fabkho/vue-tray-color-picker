import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ColorPicker from '../../src/ColorPicker.vue'
import { DEFAULT_SUGGESTIONS } from '../../src/suggestions'

type PickerProps = InstanceType<typeof ColorPicker>['$props']

let wrapper: VueWrapper | null = null

function render(props: PickerProps) {
  wrapper = mount(ColorPicker, { props, attachTo: document.body })
  return wrapper
}

const settle = async () => {
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

const trigger = () => document.querySelector<HTMLButtonElement>('.vtcp-trigger')!
/** Scoped to the tray: the nested surface's shade ladder is also role=radio,
    and its popover is in the DOM whether or not it has been opened. */
const swatches = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.vtcp-tray__group [role="radio"]'))

const trayPanel = () => document.querySelector('.vtcp-tray')?.closest('[popover]') ?? null
const trayIsOpen = () => trayPanel()?.matches(':popover-open') ?? false
const clearSwatch = () => document.querySelector<HTMLButtonElement>('.vtcp-swatch--clear')
const customSwatch = () => document.querySelector<HTMLButtonElement>('.vtcp-swatch--custom')!

async function openTray(props: PickerProps) {
  const w = render(props)
  trigger().click()
  await settle()
  return w
}

const emittedValue = (w: VueWrapper) =>
  (w.emitted('update:modelValue')?.at(-1) as (string | null)[] | undefined)?.[0]

beforeEach(() => localStorage.clear())

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  localStorage.clear()
})

describe('ColorPicker — tray', () => {
  it('opens a swatch for every suggestion', async () => {
    await openTray({ modelValue: null })
    expect(swatches()).toHaveLength(DEFAULT_SUGGESTIONS.length)
  })

  it('commits a swatch and closes the tray', async () => {
    const w = await openTray({ modelValue: null })
    swatches()[1]!.click()
    await settle()
    expect(emittedValue(w)).toBe(DEFAULT_SUGGESTIONS[1]!.value)
    expect(trayIsOpen()).toBe(false)
  })

  it('takes consumer-supplied suggestions with their own names', async () => {
    await openTray({
      modelValue: null,
      suggestions: [{ value: '#123456', label: 'Ocean' }],
    })
    expect(swatches()).toHaveLength(1)
    expect(swatches()[0]!.getAttribute('aria-label')).toBe('Ocean')
  })

  it('marks the selected swatch, matching case-insensitively', async () => {
    await openTray({ modelValue: DEFAULT_SUGGESTIONS[2]!.value.toUpperCase() })
    expect(swatches()[2]!.getAttribute('aria-checked')).toBe('true')
    expect(swatches().filter(s => s.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  })

  it('announces the group', async () => {
    await openTray({ modelValue: null })
    const group = document.querySelector('[role="radiogroup"]')!
    expect(group.getAttribute('aria-label')).toBe('Select colour')
  })
})

describe('ColorPicker — keyboard', () => {
  it('is one tab stop', async () => {
    await openTray({ modelValue: null })
    expect(swatches().filter(s => s.tabIndex === 0)).toHaveLength(1)
  })

  it('moves and selects with arrows', async () => {
    const w = await openTray({ modelValue: DEFAULT_SUGGESTIONS[0]!.value })
    swatches()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await settle()
    expect(emittedValue(w)).toBe(DEFAULT_SUGGESTIONS[1]!.value)
  })

  it('wraps at the ends', async () => {
    const w = await openTray({ modelValue: DEFAULT_SUGGESTIONS[0]!.value })
    swatches()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await settle()
    expect(emittedValue(w)).toBe(DEFAULT_SUGGESTIONS.at(-1)!.value)
  })

  it('reaches the ends with Home and End', async () => {
    const w = await openTray({ modelValue: DEFAULT_SUGGESTIONS[2]!.value })
    swatches()[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await settle()
    expect(emittedValue(w)).toBe(DEFAULT_SUGGESTIONS.at(-1)!.value)

    swatches()[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await settle()
    expect(emittedValue(w)).toBe(DEFAULT_SUGGESTIONS[0]!.value)
  })
})

describe('ColorPicker — clear swatch', () => {
  it('is absent unless asked for', async () => {
    await openTray({ modelValue: '#2b6af8' })
    expect(clearSwatch()).toBeNull()
  })

  it('unsets the value', async () => {
    const w = await openTray({ modelValue: '#2b6af8', clearable: true })
    clearSwatch()!.click()
    await settle()
    expect(emittedValue(w)).toBeNull()
  })

  it('reads as pressed only while the value is unset', async () => {
    await openTray({ modelValue: null, clearable: true })
    expect(clearSwatch()!.getAttribute('aria-pressed')).toBe('true')
    wrapper!.unmount()

    await openTray({ modelValue: '#2b6af8', clearable: true })
    expect(clearSwatch()!.getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the colour it will revert to', async () => {
    await openTray({ modelValue: '#2b6af8', clearable: true, defaultColor: '#1bc98e' })
    expect(clearSwatch()!.style.getPropertyValue('--color')).toBe('#1bc98e')
  })

  it('sits outside the radio group, being a toggle rather than a choice', async () => {
    await openTray({ modelValue: null, clearable: true })
    expect(clearSwatch()!.closest('[role="radiogroup"]')).toBeNull()
    expect(clearSwatch()!.getAttribute('role')).not.toBe('radio')
  })
})

describe('ColorPicker — default colour resolution', () => {
  it('resolves a CSS variable default off the rendered element', async () => {
    // The surface cannot decompose var(); it has to be read back after paint.
    document.documentElement.style.setProperty('--brand', '#d33e8a')
    await openTray({ modelValue: null, defaultColor: 'var(--brand)' })

    customSwatch().click()
    await settle()

    const preview = document.querySelector<HTMLElement>('.vtcp-surface__preview')!
    expect(preview.style.getPropertyValue('--preview')).toBe('#d33e8a')
    document.documentElement.style.removeProperty('--brand')
  })

  it('expands a shorthand default', async () => {
    document.documentElement.style.setProperty('--brand', '#abc')
    await openTray({ modelValue: null, defaultColor: 'var(--brand)' })

    customSwatch().click()
    await settle()

    const preview = document.querySelector<HTMLElement>('.vtcp-surface__preview')!
    expect(preview.style.getPropertyValue('--preview')).toBe('#aabbcc')
    document.documentElement.style.removeProperty('--brand')
  })
})

describe('ColorPicker — recents', () => {
  async function mixAColor(props: PickerProps, hex: string) {
    const w = await openTray(props)
    customSwatch().click()
    await settle()
    await document.querySelector<HTMLInputElement>('.vtcp-hex')!.focus()
    const field = document.querySelector<HTMLInputElement>('.vtcp-hex')!
    field.value = hex
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    document.querySelector<HTMLButtonElement>('.vtcp-action--primary')!.click()
    await settle()
    return w
  }

  it('remembers a mixed colour for next time', async () => {
    await mixAColor({ modelValue: null, range: 'full' }, '#123456')
    wrapper!.unmount()

    await openTray({ modelValue: null, range: 'full' })
    const labels = swatches().map(s => s.getAttribute('aria-label'))
    expect(labels).toContain('#123456')
  })

  it('never records a preset', async () => {
    const preset = DEFAULT_SUGGESTIONS[0]!.value
    await mixAColor({ modelValue: null, range: 'full' }, preset)
    wrapper!.unmount()

    await openTray({ modelValue: null, range: 'full' })
    expect(swatches()).toHaveLength(DEFAULT_SUGGESTIONS.length)
  })

  it('caps the history and keeps the newest first', async () => {
    for (const hex of ['#111111', '#222222', '#333333', '#444444']) {
      await mixAColor({ modelValue: null, range: 'full', recentLimit: 3 }, hex)
      wrapper!.unmount()
    }

    await openTray({ modelValue: null, range: 'full', recentLimit: 3 })
    const recents = swatches().slice(DEFAULT_SUGGESTIONS.length)
      .map(s => s.getAttribute('aria-label'))
    expect(recents).toEqual(['#444444', '#333333', '#222222'])
  })

  it('keeps separate histories per key', async () => {
    await mixAColor({ modelValue: null, range: 'full', recentKey: 'brand' }, '#123456')
    wrapper!.unmount()

    await openTray({ modelValue: null, range: 'full', recentKey: 'background' })
    expect(swatches()).toHaveLength(DEFAULT_SUGGESTIONS.length)
    wrapper!.unmount()

    await openTray({ modelValue: null, range: 'full', recentKey: 'brand' })
    expect(swatches().map(s => s.getAttribute('aria-label'))).toContain('#123456')
  })

  it('persists nothing when the key is null', async () => {
    await mixAColor({ modelValue: null, range: 'full', recentKey: null }, '#123456')
    expect(localStorage.length).toBe(0)
    wrapper!.unmount()

    await openTray({ modelValue: null, range: 'full', recentKey: null })
    expect(swatches()).toHaveLength(DEFAULT_SUGGESTIONS.length)
  })
})

describe('ColorPicker — the burst', () => {
  const items = () => Array.from(document.querySelectorAll<HTMLElement>('.vtcp-tray__item'))

  it('numbers the items in visual order, clear first and custom last', async () => {
    await openTray({ modelValue: null, clearable: true })
    const indices = items().map(el => Number(el.style.getPropertyValue('--burst-i')))
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
    expect(indices[0]).toBe(0)
    expect(indices.at(-1)).toBe(DEFAULT_SUGGESTIONS.length + 1)
  })

  it('starts at zero without the clear swatch', async () => {
    await openTray({ modelValue: null })
    expect(items()[0]!.style.getPropertyValue('--burst-i')).toBe('0')
  })

  it('tells every item how long the cascade is, so the stagger can tighten', async () => {
    await openTray({ modelValue: null, clearable: true })
    const total = getComputedStyle(items()[0]!).getPropertyValue('--burst-total').trim()
    expect(Number(total)).toBe(DEFAULT_SUGGESTIONS.length + 2)
  })

  it('actually animates on open', async () => {
    await openTray({ modelValue: null })
    const first = items()[0]!
    expect(getComputedStyle(first).animationName).toBe('vtcp-burst-in')
    expect(getComputedStyle(first).animationFillMode).toBe('both')
  })

  it('staggers later items behind earlier ones', async () => {
    await openTray({ modelValue: null })
    const delays = items().map(el => Number.parseFloat(getComputedStyle(el).animationDelay))
    expect(delays[0]).toBe(0)
    expect(delays.at(-1)!).toBeGreaterThan(delays[0]!)
  })

  it('replays the next time the tray opens', async () => {
    // The content mounts fresh per open; a persistent panel would run the
    // animation once and never again.
    const w = await openTray({ modelValue: null })
    expect(items().length).toBeGreaterThan(0)

    trigger().click()
    await settle()
    expect(items()).toHaveLength(0)

    trigger().click()
    await settle()
    expect(getComputedStyle(items()[0]!).animationName).toBe('vtcp-burst-in')
    expect(w).toBeTruthy()
  })
})

describe('ColorPicker — the burst does not spill', () => {
  const tray = () => document.querySelector<HTMLElement>('.vtcp-tray')!

  const burstFinished = () => Promise.all(
    tray().getAnimations({ subtree: true }).map(animation => animation.finished),
  )

  it('clips the pill while the items are still flying in', async () => {
    await openTray({ modelValue: null, clearable: true })
    // The last item starts several centimetres left of the pill; unclipped it
    // is a row of specks sitting outside it.
    expect(getComputedStyle(tray()).clipPath).toMatch(/inset/)
  })

  it('clips sideways only, leaving the vertical axis free', async () => {
    // overflow-x cannot express this: a `visible` axis paired with a clipped one
    // computes to `auto`, which clips both. The negative top and bottom insets
    // are what keep the hover lift and the item shadows alive.
    await openTray({ modelValue: null, clearable: true })
    const clip = getComputedStyle(tray()).clipPath

    // Browsers re-serialise inset() in its shortest form, so `inset(-2rem 0)`
    // comes back as two values, not four. Expand it the way the box model does.
    const parts = clip.replace(/^inset\(|\)$/g, '').split(/\s+/).map(Number.parseFloat)
    const [top, right = top, bottom = top, left = right] = parts as number[]

    expect(top!).toBeLessThan(0)
    expect(bottom!).toBeLessThan(0)
    expect(right!).toBe(0)
    expect(left!).toBe(0)
    expect(getComputedStyle(tray()).overflow).not.toBe('hidden')
  })

  it('releases the clip once they land, so the hover lift can rise', async () => {
    await openTray({ modelValue: null, clearable: true })
    await burstFinished()
    await settle()
    expect(getComputedStyle(tray()).clipPath).toBe('none')
  })

  it('keeps no item outside the pill once settled', async () => {
    await openTray({ modelValue: null, clearable: true })
    await burstFinished()
    await settle()

    const pill = tray().getBoundingClientRect()
    for (const item of document.querySelectorAll<HTMLElement>('.vtcp-tray__item')) {
      const box = item.getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(pill.left - 1)
      expect(box.right).toBeLessThanOrEqual(pill.right + 1)
    }
  })

  it('clips again on the next open', async () => {
    await openTray({ modelValue: null })
    await burstFinished()
    await settle()
    expect(getComputedStyle(tray()).clipPath).toBe('none')

    trigger().click()
    await settle()
    trigger().click()
    await settle()
    expect(getComputedStyle(tray()).clipPath).toMatch(/inset/)
  })
})

describe('ColorPicker — the custom swatch', () => {
  it('sits outside the group that lifts on hover', async () => {
    // The lift is scoped to .vtcp-tray__group. The custom trigger opens a panel;
    // it is not one of the colours being chosen, so it must not lift.
    await openTray({ modelValue: null })
    expect(customSwatch().closest('.vtcp-tray__group')).toBeNull()
  })

  it('is a filled well rather than a transparent hole', async () => {
    await openTray({ modelValue: null })
    const background = getComputedStyle(customSwatch()).backgroundColor
    expect(background).not.toBe('rgba(0, 0, 0, 0)')
    expect(background).not.toBe('transparent')
  })

  it('carries a dashed border to read as an affordance', async () => {
    await openTray({ modelValue: null })
    expect(getComputedStyle(customSwatch()).borderStyle).toBe('dashed')
  })

  it('renders an icon rather than a text plus', async () => {
    await openTray({ modelValue: null })
    expect(customSwatch().querySelector('svg')).not.toBeNull()
  })
})

describe('ColorPicker — nested surface', () => {
  it('opens the surface without closing the tray', async () => {
    await openTray({ modelValue: null })
    customSwatch().click()
    await settle()

    expect(document.querySelector('.vtcp-surface')).not.toBeNull()
    expect(trayIsOpen()).toBe(true)
  })

  it('closes both once a colour is committed', async () => {
    const w = await openTray({ modelValue: null })
    customSwatch().click()
    await settle()
    document.querySelector<HTMLButtonElement>('.vtcp-action--primary')!.click()
    await settle()

    expect(emittedValue(w)).toMatch(/^#[0-9a-f]{6}$/)
    expect(trayIsOpen()).toBe(false)
  })
})

describe('ColorPicker — disabled', () => {
  it('does not open', async () => {
    render({ modelValue: '#2b6af8', disabled: true })
    expect(trigger().disabled).toBe(true)
    trigger().click()
    await settle()
    expect(trayIsOpen()).toBe(false)
  })
})

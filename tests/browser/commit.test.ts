import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import ColorPicker from '../../src/ColorPicker.vue'
import ColorSurface from '../../src/ColorSurface.vue'
import { DEFAULT_SUGGESTIONS } from '../../src/suggestions'

let wrapper: VueWrapper | null = null

const settle = async () => {
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

/**
 * A real v-model host. This is the point of these tests: in immediate mode the
 * component's own writes come straight back in as `modelValue`, and a detached
 * mount would never reproduce that.
 */
function hostFor(initial: string | null, commit: 'confirm' | 'immediate') {
  const model = ref<string | null>(initial)
  const writes: (string | null)[] = []
  const Host = defineComponent({
    setup() {
      return () => h(ColorSurface, {
        'modelValue': model.value,
        'range': 'full',
        commit,
        'onUpdate:modelValue': (value: string) => {
          writes.push(value)
          model.value = value
        },
      })
    },
  })
  return { Host, model, writes }
}

const hueBand = () => document.querySelectorAll<HTMLInputElement>('.vtcp-band')[0]!
const shades = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.vtcp-shade'))
const ringedIndex = () => shades().findIndex(s => s.getAttribute('aria-checked') === 'true')

async function setBand(band: HTMLInputElement, value: string) {
  band.value = value
  band.dispatchEvent(new Event('input', { bubbles: true }))
  await settle()
}

beforeEach(() => localStorage.clear())

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  localStorage.clear()
})

describe('commit mode — the footer', () => {
  it('defaults to confirm, so existing behaviour is unchanged', () => {
    wrapper = mount(ColorSurface, { props: { modelValue: '#2b6af8' }, attachTo: document.body })
    expect(document.querySelector('.vtcp-surface__footer')).not.toBeNull()
  })

  it('drops the footer in immediate mode', () => {
    wrapper = mount(ColorSurface, {
      props: { modelValue: '#2b6af8', commit: 'immediate' },
      attachTo: document.body,
    })
    expect(document.querySelector('.vtcp-surface__footer')).toBeNull()
  })
})

describe('commit mode — writing', () => {
  it('writes nothing until save in confirm mode', async () => {
    const { Host, writes } = hostFor('#2b6af8', 'confirm')
    wrapper = mount(Host, { attachTo: document.body })

    await setBand(hueBand(), '100')
    await shades()[1]!.click()
    await settle()
    expect(writes).toHaveLength(0)

    document.querySelector<HTMLButtonElement>('.vtcp-action--primary')!.click()
    await settle()
    expect(writes).toHaveLength(1)
  })

  it('writes on every move in immediate mode', async () => {
    const { Host, writes } = hostFor('#2b6af8', 'immediate')
    wrapper = mount(Host, { attachTo: document.body })

    await setBand(hueBand(), '100')
    await setBand(hueBand(), '140')
    await setBand(hueBand(), '180')

    expect(writes.length).toBeGreaterThanOrEqual(3)
    for (const write of writes) expect(write).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('commit mode — the echo guard', () => {
  /**
   * The failure this exists to prevent: our own write returns as `modelValue`,
   * the adopt watch treats it as a new external value and re-snaps the axes,
   * and the control the user is dragging jumps under their finger.
   */
  it('leaves the hue where the user put it after the write echoes back', async () => {
    const { Host, model } = hostFor('#2b6af8', 'immediate')
    wrapper = mount(Host, { attachTo: document.body })

    await setBand(hueBand(), '137')
    // The echo has landed by now — the model holds our own generated colour.
    expect(model.value).toMatch(/^#[0-9a-f]{6}$/)
    expect(hueBand().value).toBe('137')
  })

  it('does not shift the chosen shade when the write echoes back', async () => {
    const { Host } = hostFor('#2b6af8', 'immediate')
    wrapper = mount(Host, { attachTo: document.body })

    await shades()[4]!.click()
    const after = ringedIndex()
    expect(after).toBe(4)

    await setBand(hueBand(), '50')
    expect(ringedIndex()).toBe(4)
  })

  it('keeps the ring on through a sequence of moves', async () => {
    const { Host } = hostFor('#7a8b99', 'immediate')
    wrapper = mount(Host, { attachTo: document.body })

    await shades()[2]!.click()
    for (const hue of ['30', '90', '210', '330']) {
      await setBand(hueBand(), hue)
      // Every move regenerates the draft from the axes, so the rung it sits on
      // must keep matching.
      expect(ringedIndex(), `hue ${hue}`).toBe(2)
    }
  })

  it('still adopts a genuinely external change', async () => {
    const { Host, model } = hostFor('#2b6af8', 'immediate')
    wrapper = mount(Host, { attachTo: document.body })

    model.value = '#1bc98e'
    await settle()

    const preview = document.querySelector<HTMLElement>('.vtcp-surface__preview')!
    expect(preview.style.getPropertyValue('--preview')).toBe('#1bc98e')
  })
})

describe('commit mode — recents', () => {
  const trigger = () => document.querySelector<HTMLButtonElement>('.vtcp-trigger')!
  const customSwatch = () => document.querySelector<HTMLButtonElement>('.vtcp-swatch--custom')!
  const traySwatches = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('.vtcp-tray__group [role="radio"]'))

  async function openSurface(commit: 'confirm' | 'immediate') {
    const model = ref<string | null>(null)
    const Host = defineComponent({
      setup() {
        return () => h(ColorPicker, {
          'modelValue': model.value,
          'range': 'full',
          commit,
          'recentKey': 'pg:commit',
          'onUpdate:modelValue': (value: string | null) => { model.value = value },
        })
      },
    })
    wrapper = mount(Host, { attachTo: document.body })
    trigger().click()
    await settle()
    customSwatch().click()
    await settle()
    return model
  }

  it('records nothing while dragging in immediate mode', async () => {
    await openSurface('immediate')

    await setBand(hueBand(), '40')
    await setBand(hueBand(), '80')
    await setBand(hueBand(), '120')

    expect(localStorage.getItem('pg:commit')).toBeNull()
  })

  it('records once the surface is dismissed', async () => {
    await openSurface('immediate')

    await setBand(hueBand(), '40')
    await setBand(hueBand(), '80')

    await setBand(hueBand(), '120')
    const stored = () => JSON.parse(localStorage.getItem('pg:commit') ?? '[]') as string[]
    // A drag that is still under way has no final colour to record yet.
    expect(stored()).toHaveLength(0)

    // Closing is the only exit in immediate mode.
    document.querySelector<HTMLButtonElement>('.vtcp-swatch--custom')!.click()
    await settle()
    expect(stored()).toHaveLength(1)
  })

  it('records the final colour, not the path taken to it', async () => {
    await openSurface('immediate')

    await setBand(hueBand(), '40')
    await setBand(hueBand(), '200')
    const finalPreview = document.querySelector<HTMLElement>('.vtcp-surface__preview')!
      .style.getPropertyValue('--preview')

    document.querySelector<HTMLButtonElement>('.vtcp-swatch--custom')!.click()
    await settle()

    const stored = JSON.parse(localStorage.getItem('pg:commit') ?? '[]') as string[]
    expect(stored).toEqual([finalPreview])
  })

  it('records on save in confirm mode', async () => {
    await openSurface('confirm')

    await setBand(hueBand(), '40')
    expect(localStorage.getItem('pg:commit')).toBeNull()

    document.querySelector<HTMLButtonElement>('.vtcp-action--primary')!.click()
    await settle()

    const stored = JSON.parse(localStorage.getItem('pg:commit') ?? '[]') as string[]
    expect(stored).toHaveLength(1)
  })

  it('never records a preset in either mode', async () => {
    const model = await openSurface('immediate')
    model.value = DEFAULT_SUGGESTIONS[0]!.value
    await settle()

    document.querySelector<HTMLButtonElement>('.vtcp-swatch--custom')!.click()
    await settle()

    expect(traySwatches()).toHaveLength(DEFAULT_SUGGESTIONS.length)
  })
})

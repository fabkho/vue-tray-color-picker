import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ColorSurface from '../../src/ColorSurface.vue'
import { resolveAxes, shadesFor, VIVID_SATURATION_INDEX } from '../../src/color'

type SurfaceProps = InstanceType<typeof ColorSurface>['$props']

let wrapper: VueWrapper | null = null

function render(props: SurfaceProps) {
  wrapper = mount(ColorSurface, { props, attachTo: document.body })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

const shades = (w: VueWrapper) => w.findAll('[role="radio"]')
const ringed = (w: VueWrapper) => shades(w).findIndex(s => s.attributes('aria-checked') === 'true')
const preview = (w: VueWrapper) => w.find('.vtcp-surface__preview').attributes('style') ?? ''
const committed = (w: VueWrapper) =>
  (w.emitted('update:modelValue')?.at(-1) as string[] | undefined)?.[0]

describe('ColorSurface — the draft is the caller\'s value', () => {
  it('saves an untouched off-ladder colour verbatim', async () => {
    const w = render({ modelValue: '#7a8b99' })
    await w.find('.vtcp-action--primary').trigger('click')
    expect(committed(w)).toBe('#7a8b99')
  })

  it('shows the incoming colour in the preview, not a snapped one', () => {
    const w = render({ modelValue: '#7a8b99' })
    expect(preview(w)).toContain('#7a8b99')
  })

  it('emits nothing on cancel', async () => {
    const w = render({ modelValue: '#7a8b99' })
    await w.find('.vtcp-action--secondary').trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.emitted('close')).toHaveLength(1)
  })
})

describe('ColorSurface — the ring is honest', () => {
  it('rings nothing when the value is not on the ladder', () => {
    for (const hex of ['#7a8b99', '#8a8a8f', '#12203f', '#2b6af8']) {
      const w = render({ modelValue: hex })
      expect(ringed(w), hex).toBe(-1)
      w.unmount()
    }
    wrapper = null
  })

  it('rings the rung a ladder-generated colour sits on', () => {
    const generated = shadesFor(210, VIVID_SATURATION_INDEX, 'identity')[3]!
    const w = render({ modelValue: generated })
    expect(ringed(w)).toBe(3)
  })

  it('rings the shade the user just picked', async () => {
    const w = render({ modelValue: '#7a8b99' })
    expect(ringed(w)).toBe(-1)
    await shades(w)[1]!.trigger('click')
    expect(ringed(w)).toBe(1)
  })

  it('keeps exactly one tab stop even with nothing ringed', () => {
    const w = render({ modelValue: '#7a8b99' })
    const tabbable = shades(w).filter(s => s.attributes('tabindex') === '0')
    expect(ringed(w)).toBe(-1)
    expect(tabbable).toHaveLength(1)
  })

  it('parks that tab stop on the nearest rung', () => {
    const w = render({ modelValue: '#7a8b99' })
    const nearest = resolveAxes('#7a8b99', 'identity')!.lightnessIndex
    expect(shades(w)[nearest]!.attributes('tabindex')).toBe('0')
  })
})

describe('ColorSurface — keyboard', () => {
  it('moves and selects together with arrows', async () => {
    const w = render({ modelValue: '#7a8b99' })
    await shades(w)[1]!.trigger('click')
    await shades(w)[1]!.trigger('keydown', { key: 'ArrowRight' })
    expect(ringed(w)).toBe(2)
    await shades(w)[2]!.trigger('keydown', { key: 'ArrowLeft' })
    expect(ringed(w)).toBe(1)
  })

  it('wraps at both ends', async () => {
    const w = render({ modelValue: '#7a8b99' })
    const last = shades(w).length - 1
    await shades(w)[0]!.trigger('click')
    await shades(w)[0]!.trigger('keydown', { key: 'ArrowLeft' })
    expect(ringed(w)).toBe(last)
  })

  it('reaches the ends with Home and End', async () => {
    const w = render({ modelValue: '#7a8b99' })
    await shades(w)[2]!.trigger('click')
    await shades(w)[2]!.trigger('keydown', { key: 'End' })
    expect(ringed(w)).toBe(shades(w).length - 1)
    await shades(w)[shades(w).length - 1]!.trigger('keydown', { key: 'Home' })
    expect(ringed(w)).toBe(0)
  })

  it('moves focus with the selection', async () => {
    const w = render({ modelValue: '#7a8b99' })
    await shades(w)[1]!.trigger('click')
    await shades(w)[1]!.trigger('keydown', { key: 'ArrowRight' })
    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(document.activeElement).toBe(shades(w)[2]!.element)
  })
})

describe('ColorSurface — range variants', () => {
  it('hides saturation and hex for an identity colour', () => {
    const w = render({ modelValue: '#2b6af8' })
    expect(w.findAll('.vtcp-band')).toHaveLength(1)
    expect(w.find('.vtcp-hex').exists()).toBe(false)
  })

  it('offers saturation and hex in full range', () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    expect(w.findAll('.vtcp-band')).toHaveLength(2)
    expect(w.find('.vtcp-hex').exists()).toBe(true)
  })

  it('reaches a grey only in full range', async () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    const saturation = w.findAll('.vtcp-band')[1]!
    await saturation.setValue('0')
    await w.find('.vtcp-action--primary').trigger('click')
    // Saturation zero: all channels equal.
    const hex = committed(w)!
    expect(hex.slice(1, 3)).toBe(hex.slice(3, 5))
    expect(hex.slice(3, 5)).toBe(hex.slice(5, 7))
  })
})

describe('ColorSurface — hex entry', () => {
  it('treats an empty field as neutral, not invalid', async () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    const hex = w.find('.vtcp-hex')
    await hex.setValue('')
    expect(hex.attributes('aria-invalid')).toBe('false')
  })

  it('marks a malformed value invalid without touching the draft', async () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    const hex = w.find('.vtcp-hex')
    await hex.setValue('#zzz')
    expect(hex.attributes('aria-invalid')).toBe('true')
    expect(preview(w)).toContain('#2b6af8')
  })

  it('adopts a valid value', async () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    await w.find('.vtcp-hex').setValue('#1bc98e')
    expect(preview(w)).toContain('#1bc98e')
  })

  it('does not rewrite the field while typing', async () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    const hex = w.find('.vtcp-hex')
    await hex.setValue('#1bc98e')
    // A rewrite would upper-case it and move the caret.
    expect((hex.element as HTMLInputElement).value).toBe('#1bc98e')
  })
})

describe('ColorSurface — disabled', () => {
  it('disables every control', () => {
    const w = render({ modelValue: '#2b6af8', range: 'full', disabled: true })
    const controls = w.findAll('.vtcp-band, .vtcp-shade, .vtcp-hex')
    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      expect(control.attributes('disabled')).toBeDefined()
    }
  })
})

describe('ColorSurface — labels', () => {
  it('falls back to English', () => {
    const w = render({ modelValue: '#2b6af8' })
    expect(w.find('[role="radiogroup"]').attributes('aria-label')).toBe('Shades')
    expect(w.find('.vtcp-action--primary').text()).toBe('Save')
  })

  it('takes overrides without importing an i18n runtime', () => {
    const w = render({ modelValue: '#2b6af8', labels: { shades: 'Abstufungen', save: 'Speichern' } })
    expect(w.find('[role="radiogroup"]').attributes('aria-label')).toBe('Abstufungen')
    expect(w.find('.vtcp-action--primary').text()).toBe('Speichern')
    // Unset keys keep their default.
    expect(w.find('.vtcp-action--secondary').text()).toBe('Cancel')
  })
})

describe('ColorSurface — accessible names', () => {
  it('names every shade and both bands', () => {
    const w = render({ modelValue: '#2b6af8', range: 'full' })
    for (const shade of shades(w)) {
      expect(shade.attributes('aria-label')).toMatch(/^#[0-9a-f]{6}$/)
    }
    const bands = w.findAll('.vtcp-band')
    expect(bands[0]!.attributes('aria-label')).toBe('Hue')
    expect(bands[1]!.attributes('aria-label')).toBe('Saturation')
  })
})

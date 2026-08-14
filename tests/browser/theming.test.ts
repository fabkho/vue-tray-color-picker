import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ColorSurface from '../../src/ColorSurface.vue'

/**
 * The contract: a consumer restyles the picker with custom properties alone.
 * The trap these tests exist for is specificity — declaring the public names on
 * the component root would out-specify a consumer's `:root` rule and their
 * override would silently do nothing.
 */

let wrapper: VueWrapper | null = null

function render(extraClass?: string) {
  wrapper = mount(ColorSurface, {
    props: { modelValue: '#2b6af8', range: 'full' },
    attachTo: document.body,
    ...(extraClass ? { attrs: { class: extraClass } } : {}),
  })
  return document.querySelector<HTMLElement>('.vtcp-surface')!
}

const styleTags: HTMLStyleElement[] = []

function addStyle(css: string) {
  const tag = document.createElement('style')
  tag.textContent = css
  document.head.appendChild(tag)
  styleTags.push(tag)
}

const resolved = (el: HTMLElement, prop: string) =>
  getComputedStyle(el).getPropertyValue(prop).trim()

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  for (const tag of styleTags.splice(0)) tag.remove()
  document.documentElement.style.cssText = ''
})

describe('theming — defaults', () => {
  it('renders with no theme defined at all', () => {
    const el = render()
    expect(resolved(el, '--_radius')).toBe('0.75rem')
    expect(resolved(el, '--_swatch-size')).toBe('2.25rem')
    expect(resolved(el, '--_duration')).toBe('340ms')
    expect(resolved(el, '--_surface')).not.toBe('')
  })

  it('applies the default radius to the rendered box', () => {
    const el = render()
    expect(getComputedStyle(el).borderRadius).not.toBe('0px')
  })
})

describe('theming — component tier', () => {
  it('takes a --vtcp-* override from :root', () => {
    // The specificity trap: a declaration on .vtcp would beat this.
    addStyle(':root { --vtcp-radius: 2rem; --vtcp-swatch-size: 3rem; }')
    const el = render()
    expect(resolved(el, '--_radius')).toBe('2rem')
    expect(resolved(el, '--_swatch-size')).toBe('3rem')
  })

  it('reaches the rendered box, not just the variable', () => {
    addStyle(':root { --vtcp-radius: 2rem; }')
    const el = render()
    expect(getComputedStyle(el).borderRadius).toBe('32px')
  })

  it('takes an override scoped to one instance', () => {
    addStyle('.themed { --vtcp-swatch-size: 4rem; }')
    const el = render('themed')
    expect(resolved(el, '--_swatch-size')).toBe('4rem')
  })

  it('resizes the shades from the swatch-size token', () => {
    addStyle(':root { --vtcp-swatch-size: 3rem; }')
    render()
    const shade = document.querySelector<HTMLElement>('.vtcp-shade')!
    expect(getComputedStyle(shade).width).toBe('48px')
  })
})

describe('theming — design-system tier', () => {
  it('adopts --ui-* when no component override is present', () => {
    addStyle(':root { --ui-radius: 1.5rem; --ui-duration: 120ms; }')
    const el = render()
    expect(resolved(el, '--_radius')).toBe('1.5rem')
    expect(resolved(el, '--_duration')).toBe('120ms')
  })

  it('lets the component tier win over the design-system tier', () => {
    addStyle(':root { --ui-radius: 1.5rem; --vtcp-radius: 2rem; }')
    const el = render()
    expect(resolved(el, '--_radius')).toBe('2rem')
  })

  it('falls back past an unset design-system tier to the literal', () => {
    const el = render()
    expect(resolved(el, '--_radius')).toBe('0.75rem')
  })
})

describe('theming — dark mode', () => {
  it('needs no class or data attribute from the host', () => {
    const el = render()
    expect(el.className).not.toMatch(/dark/)
    expect(el.getAttribute('data-theme')).toBeNull()
  })

  it('follows a colour scheme inherited from the host', () => {
    const el = render()
    const light = getComputedStyle(el).backgroundColor

    document.documentElement.style.colorScheme = 'dark'
    const dark = getComputedStyle(el).backgroundColor

    expect(dark).not.toBe(light)
  })

  it('does not override a host that forces one scheme', () => {
    // Declaring color-scheme on the component would win here, and the picker
    // would sit in dark mode inside a light-only app.
    document.documentElement.style.colorScheme = 'light'
    const el = render()
    expect(getComputedStyle(el).backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it('resolves to the light value when the host declares nothing', () => {
    const el = render()
    expect(getComputedStyle(el).backgroundColor).toBe('rgb(255, 255, 255)')
  })
})

describe('theming — motion', () => {
  it('ships an easing so a transition is defined without a host stylesheet', () => {
    const el = render()
    expect(resolved(el, '--_ease')).toContain('linear(')
  })

  it('carries its own reduced-motion block', async () => {
    // The host's global motion reset does not come with the package, so the
    // rule has to be in our stylesheet. Assert on the stylesheet rather than by
    // emulating the media query, which the runner cannot do here.
    const sheets = Array.from(document.styleSheets)
    const rules = sheets.flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules)
      }
      catch {
        return []
      }
    })
    const reduced = rules.filter(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion'),
    )
    expect(reduced.length).toBeGreaterThan(0)
    expect(reduced.some(rule => rule.cssText.includes('vtcp'))).toBe(true)
  })
})

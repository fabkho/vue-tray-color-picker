import { userEvent } from '@vitest/browser/context'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import ColorPopover from '../../src/ColorPopover.vue'

let wrapper: VueWrapper | null = null

/** A host with a real trigger button and two focusables in the panel. */
const Host = defineComponent({
  props: {
    placement: { type: String, default: 'bottom-start' },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    return () => h(ColorPopover as never, {
      placement: props.placement,
      disabled: props.disabled,
    }, {
      trigger: ({ toggle, triggerAttrs }: {
        toggle: () => void
        triggerAttrs: Record<string, string>
      }) => h('button', { id: 'trigger', onClick: toggle, ...triggerAttrs }, 'open'),
      default: ({ close }: { close: () => void }) => [
        h('button', { id: 'first' }, 'first'),
        h('button', { id: 'last', onClick: close }, 'last'),
      ],
    })
  },
})

function render(props: Record<string, unknown> = {}) {
  wrapper = mount(Host, { props, attachTo: document.body })
  return wrapper
}

/** Popover show/hide is async in the browser; give it a frame to settle. */
const settle = async () => {
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

const panel = () => document.querySelector<HTMLElement>('.vtcp-popover')!
const trigger = () => document.querySelector<HTMLButtonElement>('#trigger')!
const isOpen = () => panel().matches(':popover-open')

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('ColorPopover — open and close', () => {
  it('opens on the trigger and closes on it again', async () => {
    render()
    expect(isOpen()).toBe(false)

    trigger().click()
    await settle()
    expect(isOpen()).toBe(true)

    trigger().click()
    await settle()
    expect(isOpen()).toBe(false)
  })

  it('puts the panel in the top layer', async () => {
    render()
    trigger().click()
    await settle()
    // :popover-open only matches for a popover the UA has promoted.
    expect(panel().matches(':popover-open')).toBe(true)
  })

  it('closes on Escape', async () => {
    render()
    trigger().click()
    await settle()

    await userEvent.keyboard('{Escape}')
    await settle()
    expect(isOpen()).toBe(false)
  })

  it('closes on an outside click', async () => {
    render()
    trigger().click()
    await settle()

    await userEvent.click(document.body)
    await settle()
    expect(isOpen()).toBe(false)
  })

  it('closes from the panel content', async () => {
    render()
    trigger().click()
    await settle()

    document.querySelector<HTMLButtonElement>('#last')!.click()
    await settle()
    expect(isOpen()).toBe(false)
  })

  it('stays shut when disabled', async () => {
    render({ disabled: true })
    trigger().click()
    await settle()
    expect(isOpen()).toBe(false)
  })
})

describe('ColorPopover — focus', () => {
  it('moves focus into the panel on open', async () => {
    render()
    trigger().click()
    await settle()
    expect(document.activeElement?.id).toBe('first')
  })

  it('returns focus to the trigger on close', async () => {
    render()
    trigger().click()
    await settle()
    trigger().click()
    await settle()
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('returns focus to the trigger after Escape', async () => {
    render()
    trigger().click()
    await settle()
    await userEvent.keyboard('{Escape}')
    await settle()
    expect(document.activeElement?.id).toBe('trigger')
  })

  it('wraps Tab at the end rather than escaping to the page', async () => {
    render()
    trigger().click()
    await settle()

    document.querySelector<HTMLButtonElement>('#last')!.focus()
    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    await settle()
    expect(document.activeElement?.id).toBe('first')
  })

  it('wraps Shift+Tab at the start', async () => {
    render()
    trigger().click()
    await settle()

    document.querySelector<HTMLButtonElement>('#first')!.focus()
    panel().dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
    }))
    await settle()
    expect(document.activeElement?.id).toBe('last')
  })
})

describe('ColorPopover — ARIA', () => {
  it('announces the expanded state and points at the panel', async () => {
    render()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger().getAttribute('aria-controls')).toBe(panel().id)

    trigger().click()
    await settle()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps aria-expanded honest after a light dismiss', async () => {
    render()
    trigger().click()
    await settle()
    await userEvent.click(document.body)
    await settle()
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })
})

describe('ColorPopover — positioning', () => {
  it('places the panel near the trigger rather than at the viewport origin', async () => {
    render()
    trigger().click()
    await settle()

    const panelBox = panel().getBoundingClientRect()
    const triggerBox = trigger().getBoundingClientRect()
    expect(panelBox.width).toBeGreaterThan(0)
    // Default placement is bottom-start: below, and left-aligned to the trigger.
    expect(panelBox.top).toBeGreaterThanOrEqual(triggerBox.bottom)
    expect(Math.abs(panelBox.left - triggerBox.left)).toBeLessThan(40)
  })

  it('keeps the panel inside the viewport when the trigger is at the edge', async () => {
    render()
    // Shove the anchor hard against the right edge.
    const anchor = document.querySelector<HTMLElement>('.vtcp-popover__anchor')!
    anchor.style.position = 'fixed'
    anchor.style.left = `${window.innerWidth - 10}px`
    anchor.style.top = '10px'

    trigger().click()
    await settle()

    const panelBox = panel().getBoundingClientRect()
    expect(panelBox.right).toBeLessThanOrEqual(window.innerWidth + 1)
    expect(panelBox.left).toBeGreaterThanOrEqual(-1)
  })

  it('flips above the trigger when there is no room below', async () => {
    render()
    const anchor = document.querySelector<HTMLElement>('.vtcp-popover__anchor')!
    anchor.style.position = 'fixed'
    anchor.style.left = '20px'
    anchor.style.top = `${window.innerHeight - 20}px`

    trigger().click()
    await settle()

    const panelBox = panel().getBoundingClientRect()
    const triggerBox = trigger().getBoundingClientRect()
    expect(panelBox.bottom).toBeLessThanOrEqual(triggerBox.top + 1)
  })

  it('escapes a clipping ancestor', async () => {
    // The classic reason a hand-rolled layer fails: an overflow:hidden parent.
    const clip = document.createElement('div')
    clip.style.cssText = 'overflow:hidden;width:80px;height:40px;position:relative'
    document.body.appendChild(clip)

    wrapper = mount(Host, { attachTo: clip })
    trigger().click()
    await settle()

    const panelBox = panel().getBoundingClientRect()
    const clipBox = clip.getBoundingClientRect()
    // Top layer: the panel extends past the clipping box instead of being cut
    // off at it, which is what an in-flow absolutely positioned panel would do.
    expect(panelBox.bottom).toBeGreaterThan(clipBox.bottom)
    expect(panelBox.height).toBeGreaterThan(0)

    clip.remove()
  })
})

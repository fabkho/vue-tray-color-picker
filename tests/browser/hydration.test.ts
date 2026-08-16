import { renderToString } from '@vue/server-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, type App } from 'vue'
import ColorPicker from '../../src/ColorPicker.vue'

/**
 * Server-render, put the markup in the page, then hydrate it — the same
 * sequence a Nuxt page performs. A mismatch here is invisible to every other
 * test in the suite, because they all mount client-side from scratch.
 */

let app: App | null = null
let host: HTMLElement | null = null

function hostFor(props: Record<string, unknown>) {
  return defineComponent({
    setup: () => () => h(ColorPicker, props as never),
  })
}

async function renderThenHydrate(props: Record<string, unknown>) {
  const server = createSSRApp(hostFor(props))
  const html = await renderToString(server)

  host = document.createElement('div')
  host.innerHTML = html
  document.body.appendChild(host)

  app = createSSRApp(hostFor(props))
  app.mount(host)
  await nextTick()

  return html
}

beforeEach(() => localStorage.clear())

afterEach(() => {
  app?.unmount()
  app = null
  host?.remove()
  host = null
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('server rendering', () => {
  it('renders the trigger without a client-only wrapper', async () => {
    const html = await renderThenHydrate({ modelValue: '#1bc98e' })
    expect(html).toContain('vtcp-trigger')
  })

  it('carries the colour in the server markup, so there is no hole to fill in', async () => {
    const html = await renderThenHydrate({ modelValue: '#1bc98e' })
    expect(html).toContain('#1bc98e')
  })

  it('falls back to the default colour when unset', async () => {
    const html = await renderThenHydrate({ modelValue: null, defaultValue: '#d33e8a' })
    expect(html).toContain('#d33e8a')
  })

  it('does not touch computed style during render', async () => {
    // getComputedStyle is meaningless on a server and forces a recalculation on
    // a client; it belongs behind the open transition, not in render.
    const spy = vi.spyOn(window, 'getComputedStyle')
    await renderThenHydrate({ modelValue: null, defaultValue: 'var(--x)' })
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('hydration', () => {
  /**
   * Vue reports a hydration mismatch by logging and carrying on — nothing
   * throws and no test fails on its own. It has used both console.warn and
   * console.error across versions, so watch both and let the negative control
   * below prove the watcher actually fires.
   */
  function watchForMismatch() {
    const messages: string[] = []
    const capture = (...args: unknown[]) => { messages.push(args.map(String).join(' ')) }
    vi.spyOn(console, 'error').mockImplementation(capture)
    vi.spyOn(console, 'warn').mockImplementation(capture)
    return {
      get mismatches() {
        return messages.filter(message => /hydrat|mismatch/i.test(message))
      },
      messages,
    }
  }

  it('detects a mismatch when there is one', async () => {
    // Negative control. Every assertion below is "console.error was not
    // called", which passes for free if Vue's mismatch reporting never reaches
    // this spy. Prove it does before trusting the rest.
    const watcher = watchForMismatch()

    const server = createSSRApp(defineComponent({ setup: () => () => h('div', 'server') }))
    const html = await renderToString(server)
    host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)

    app = createSSRApp(defineComponent({ setup: () => () => h('span', 'client') }))
    app.mount(host)
    await nextTick()

    expect(watcher.mismatches.length).toBeGreaterThan(0)
  })

  it('hydrates the trigger cleanly', async () => {
    const watcher = watchForMismatch()
    await renderThenHydrate({ modelValue: '#1bc98e' })
    expect(watcher.mismatches).toEqual([])
  })

  it('hydrates cleanly with no model bound at all', async () => {
    const watcher = watchForMismatch()
    await renderThenHydrate({ defaultValue: '#d33e8a' })
    expect(watcher.mismatches).toEqual([])
  })

  it('hydrates cleanly with recent colours already in storage', async () => {
    // The case the deferred read exists for: storage has entries the server
    // could not possibly have known about.
    localStorage.setItem('vtcp:recent', JSON.stringify(['#123456', '#654321']))

    const watcher = watchForMismatch()
    await renderThenHydrate({ modelValue: '#1bc98e' })
    expect(watcher.mismatches).toEqual([])
  })

  it('hydrates cleanly with the clear swatch and a variable default', async () => {
    const watcher = watchForMismatch()
    await renderThenHydrate({
      modelValue: null,
      clearable: true,
      defaultValue: 'var(--brand, #00dbcb)',
      range: 'full',
    })
    expect(watcher.mismatches).toEqual([])
  })

  it('picks up stored recents after hydrating', async () => {
    localStorage.setItem('vtcp:recent', JSON.stringify(['#123456']))
    await renderThenHydrate({ modelValue: null })

    host!.querySelector<HTMLButtonElement>('.vtcp-trigger')!.click()
    await nextTick()

    const labels = Array.from(
      host!.querySelectorAll<HTMLElement>('.vtcp-tray__group [role="radio"]'),
    ).map(el => el.getAttribute('aria-label'))
    expect(labels).toContain('#123456')
  })
})

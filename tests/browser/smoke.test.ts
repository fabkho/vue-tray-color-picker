import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

const Counter = defineComponent({
  setup() {
    const count = ref(0)
    return () => h('button', { onClick: () => count.value++ }, `count ${count.value}`)
  },
})

describe('browser tier', () => {
  it('runs in a real browser with layout and a live event loop', async () => {
    expect(typeof window).toBe('object')
    expect(window.getComputedStyle(document.body)).toBeTruthy()

    const wrapper = mount(Counter, { attachTo: document.body })
    // A real browser is the point: assert the element actually has a box.
    expect(wrapper.element.getBoundingClientRect().width).toBeGreaterThan(0)

    await wrapper.trigger('click')
    expect(wrapper.text()).toBe('count 1')

    wrapper.unmount()
  })
})

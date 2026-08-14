import { describe, expect, it } from 'vitest'
import { PACKAGE_NAME } from '../../src/index'

describe('unit tier', () => {
  it('runs in node and can import the package entry', () => {
    expect(PACKAGE_NAME).toBe('vue-tray-color-picker')
    expect(typeof globalThis.document).toBe('undefined')
  })
})

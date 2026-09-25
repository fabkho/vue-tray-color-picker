import { describe, expect, it } from 'vitest'
import { DEFAULT_LABELS, withDefaults } from '../../src/labels'

describe('withDefaults', () => {
  it('fills every key when given nothing', () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_LABELS)
  })

  it('never hands back the shared defaults object', () => {
    // Returning it by reference let one consumer's mutation rewrite the labels
    // of every other consumer in the process.
    const labels = withDefaults(undefined)
    expect(labels).not.toBe(DEFAULT_LABELS)
    labels.save = 'Mutated'
    expect(DEFAULT_LABELS.save).toBe('Save')
  })

  it('overrides only the keys it is given', () => {
    const labels = withDefaults({ save: 'Speichern' })
    expect(labels.save).toBe('Speichern')
    expect(labels.cancel).toBe(DEFAULT_LABELS.cancel)
  })

  it('falls back to English for an explicit undefined', () => {
    // The ordinary shape of an i18n lookup miss: `{ title: t('picker.title') }`
    // where the key is absent. A plain spread would render the label empty.
    expect(withDefaults({ title: undefined }).title).toBe(DEFAULT_LABELS.title)
  })
})

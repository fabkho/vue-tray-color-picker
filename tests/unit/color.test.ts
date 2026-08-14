import { describe, expect, it } from 'vitest'
import {
  expandHex,
  FULL_LIGHTNESS_STEPS,
  hexToHsl,
  hslToHex,
  IDENTITY_LIGHTNESS_STEPS,
  isHex,
  lightnessSteps,
  nearestStepIndex,
  resolveAxes,
  SATURATION_STEPS,
  shadesFor,
  VIVID_SATURATION_INDEX,
  type ColorRange,
} from '../../src/color'

const RANGES: ColorRange[] = ['identity', 'full']

describe('isHex', () => {
  it('accepts six-digit hex in either case', () => {
    expect(isHex('#2b6af8')).toBe(true)
    expect(isHex('#2B6AF8')).toBe(true)
  })

  it('rejects shorthand, partial input and missing hash', () => {
    for (const value of ['#2b6', '#2b6af', '2b6af8', '#2b6af8f', '', '#gggggg']) {
      expect(isHex(value), value).toBe(false)
    }
  })
})

describe('expandHex', () => {
  it('expands shorthand and normalises case', () => {
    expect(expandHex('#ABC')).toBe('#aabbcc')
    expect(expandHex('#2B6AF8')).toBe('#2b6af8')
  })

  it('returns null for anything that is neither form', () => {
    for (const value of ['#2b6af', 'rebeccapurple', 'var(--x)', '']) {
      expect(expandHex(value), value).toBeNull()
    }
  })
})

describe('hexToHsl', () => {
  it('reports neutrals as achromatic rather than dividing by zero', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 1 })
    expect(hexToHsl('#808080')?.s).toBe(0)
  })

  it('accepts shorthand', () => {
    expect(hexToHsl('#fff')).toEqual({ h: 0, s: 0, l: 1 })
  })

  it('returns null for invalid input', () => {
    expect(hexToHsl('nope')).toBeNull()
  })

  it('finds the hue of each primary', () => {
    expect(hexToHsl('#ff0000')?.h).toBeCloseTo(0, 5)
    expect(hexToHsl('#00ff00')?.h).toBeCloseTo(120, 5)
    expect(hexToHsl('#0000ff')?.h).toBeCloseTo(240, 5)
  })

  it('never reports a negative hue', () => {
    // Magenta drives the max === r branch negative before normalisation.
    expect(hexToHsl('#ff00ff')?.h).toBeCloseTo(300, 5)
  })
})

describe('hslToHex', () => {
  it('normalises hue beyond a full turn and clamps saturation and lightness', () => {
    expect(hslToHex(360, 0.5, 0.5)).toBe(hslToHex(0, 0.5, 0.5))
    expect(hslToHex(-120, 0.5, 0.5)).toBe(hslToHex(240, 0.5, 0.5))
    expect(hslToHex(0, 5, 0.5)).toBe(hslToHex(0, 1, 0.5))
    expect(hslToHex(0, 0.5, -1)).toBe('#000000')
  })

  it('always emits six digits', () => {
    for (let h = 0; h < 360; h += 7) {
      for (const l of [0.02, 0.5, 0.98]) {
        expect(hslToHex(h, 0.72, l)).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })
})

describe('round-tripping', () => {
  it('survives hex → hsl → hex without drift', () => {
    const samples = [
      '#2b6af8', '#1bc98e', '#e2a04f', '#e64759', '#8e5dca', '#d33e8a',
      '#000000', '#ffffff', '#7a8b99', '#12203f', '#f5c6d0',
    ]
    for (const hex of samples) {
      const hsl = hexToHsl(hex)!
      expect(hslToHex(hsl.h, hsl.s, hsl.l), hex).toBe(hex)
    }
  })
})

describe('nearestStepIndex', () => {
  it('finds the closest step', () => {
    expect(nearestStepIndex([0, 0.35, 0.72], 0.02)).toBe(0)
    expect(nearestStepIndex([0, 0.35, 0.72], 0.4)).toBe(1)
    expect(nearestStepIndex([0, 0.35, 0.72], 0.9)).toBe(2)
  })

  it('clamps to the ends rather than extrapolating', () => {
    expect(nearestStepIndex(IDENTITY_LIGHTNESS_STEPS, 0)).toBe(0)
    expect(nearestStepIndex(IDENTITY_LIGHTNESS_STEPS, 1)).toBe(IDENTITY_LIGHTNESS_STEPS.length - 1)
  })

  it('breaks ties toward the lower index', () => {
    expect(nearestStepIndex([0, 1], 0.5)).toBe(0)
  })
})

describe('ladders', () => {
  it('gives identity colours the legible middle and full range the extremes', () => {
    expect(lightnessSteps('identity')).toBe(IDENTITY_LIGHTNESS_STEPS)
    expect(lightnessSteps('full')).toBe(FULL_LIGHTNESS_STEPS)
    expect(Math.min(...FULL_LIGHTNESS_STEPS)).toBeLessThan(Math.min(...IDENTITY_LIGHTNESS_STEPS))
    expect(Math.max(...FULL_LIGHTNESS_STEPS)).toBeGreaterThan(Math.max(...IDENTITY_LIGHTNESS_STEPS))
  })

  it('offers a greyscale rung only through the saturation axis', () => {
    expect(SATURATION_STEPS[0]).toBe(0)
    const greys = shadesFor(210, 0, 'full')
    for (const grey of greys) {
      expect(hexToHsl(grey)!.s).toBe(0)
    }
  })

  it('produces one shade per rung, ascending in lightness', () => {
    for (const range of RANGES) {
      const shades = shadesFor(210, VIVID_SATURATION_INDEX, range)
      expect(shades).toHaveLength(lightnessSteps(range).length)
      const lightnesses = shades.map(shade => hexToHsl(shade)!.l)
      const ascending = [...lightnesses].sort((a, b) => a - b)
      expect(lightnesses, range).toEqual(ascending)
    }
  })

  it('falls back to vivid for a saturation index off the end', () => {
    expect(shadesFor(210, 99, 'identity')).toEqual(
      shadesFor(210, VIVID_SATURATION_INDEX, 'identity'),
    )
  })
})

describe('resolveAxes', () => {
  it('pins saturation to vivid outside full range', () => {
    // A muted slate: its real saturation is nowhere near vivid.
    expect(hexToHsl('#7a8b99')!.s).toBeLessThan(0.2)
    expect(resolveAxes('#7a8b99', 'identity')!.saturationIndex).toBe(VIVID_SATURATION_INDEX)
  })

  it('tracks saturation in full range', () => {
    expect(resolveAxes('#7a8b99', 'full')!.saturationIndex).toBe(
      nearestStepIndex(SATURATION_STEPS, hexToHsl('#7a8b99')!.s),
    )
  })

  it('returns null for invalid input', () => {
    expect(resolveAxes('nope', 'full')).toBeNull()
  })
})

describe('the ring invariant', () => {
  /**
   * The shade ring marks the rung whose colour *equals* the draft, compared
   * exactly. That is only safe if a colour generated from the axes is
   * byte-identical to the corresponding rung — if the two ever disagreed by a
   * rounding step, selecting a shade would clear its own ring.
   */
  it('generates a rung identical to the shade at that index', () => {
    for (const range of RANGES) {
      const steps = lightnessSteps(range)
      for (let hue = 0; hue < 360; hue += 3) {
        for (let s = 0; s < SATURATION_STEPS.length; s++) {
          const shades = shadesFor(hue, s, range)
          for (let l = 0; l < steps.length; l++) {
            expect(shades[l], `${range} h${hue} s${s} l${l}`)
              .toBe(hslToHex(hue, SATURATION_STEPS[s]!, steps[l]!))
          }
        }
      }
    }
  })

  it('rings nothing for a colour that is not on the ladder', () => {
    // Documented off-ladder cases. Each previously snapped to a rung that was
    // visibly a different colour from the preview.
    const offLadder = ['#7a8b99', '#8a8a8f', '#12203f', '#f5c6d0']
    for (const hex of offLadder) {
      const axes = resolveAxes(hex, 'identity')!
      const shades = shadesFor(axes.hue, axes.saturationIndex, 'identity')
      expect(shades, hex).not.toContain(hex)
    }
  })

  it('rings nothing for the common brand palette either', () => {
    // Not a defect: the ladder is a fixed grid and these were not generated
    // from it. Pinned so the honesty of the ring is not "fixed" by accident.
    const palette = ['#2b6af8', '#1bc98e', '#e2a04f', '#e64759', '#8e5dca', '#d33e8a']
    for (const hex of palette) {
      for (const range of RANGES) {
        const axes = resolveAxes(hex, range)!
        expect(shadesFor(axes.hue, axes.saturationIndex, range), `${hex} ${range}`)
          .not.toContain(hex)
      }
    }
  })

  it('rings a colour that was generated from the ladder', () => {
    const generated = shadesFor(210, VIVID_SATURATION_INDEX, 'identity')[2]!
    const axes = resolveAxes(generated, 'identity')!
    expect(shadesFor(axes.hue, axes.saturationIndex, 'identity')).toContain(generated)
  })
})

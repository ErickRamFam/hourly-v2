import { describe, expect, it } from 'vitest'
import { getSky } from '../../lib/skies'
import { discOpacity, skyGradient, skyTickLeft } from '../visuals'
import { ringTint } from '../clock/tint'

describe('discOpacity (seven-day row, filled by light)', () => {
  it('is empty for days with nothing done or no quests', () => {
    expect(discOpacity(0, 0)).toBe(0)
    expect(discOpacity(0, 5)).toBe(0)
  })
  it('is the share cleared with a .15 floor', () => {
    expect(discOpacity(1, 10)).toBe(0.15)
    expect(discOpacity(2, 5)).toBeCloseTo(0.4)
    expect(discOpacity(3, 5)).toBeCloseTo(0.6)
    expect(discOpacity(5, 5)).toBe(1)
  })
})

describe('sky strip', () => {
  it('is a smooth gradient through all 24 stops, first at 0% and last at 100%', () => {
    const g = skyGradient(getSky('daylight'))
    expect(g.startsWith('linear-gradient(90deg, #4C4FA6 0.00%, #444A9F 4.35%')).toBe(true)
    expect(g.endsWith('#5652A9 100.00%)')).toBe(true)
    expect(g.match(/#/g)).toHaveLength(24)
  })
  it('places the current-hour tick at the middle of the hour on a 200px strip', () => {
    expect(skyTickLeft(19)).toBeCloseTo(162.5)
    expect(skyTickLeft(0)).toBeCloseTo(4.1667, 3)
    expect(skyTickLeft(23)).toBeCloseTo(195.8333, 3)
  })
})

describe('ringTint', () => {
  it('desaturates the lap stop toward slate before applying the ring alpha', () => {
    expect(ringTint('#E8B93F')).toBe('color-mix(in oklab, color-mix(in oklab, #E8B93F 55%, var(--slate)) var(--ring-tint), transparent)')
    expect(ringTint('#E8B93F', 'var(--lantern-tint)')).toContain('var(--lantern-tint)')
  })
})

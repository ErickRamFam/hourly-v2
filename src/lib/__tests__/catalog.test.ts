import { describe, expect, it } from 'vitest'
import { DEFAULT_DIAL_ID, DIALS, getDial, isDialId } from '../dials'
import { DEFAULT_SKY_ID, SKIES, getSky, hourHue, lapStops, litHue } from '../skies'

describe('skies', () => {
  it('has four skies with 24 valid hex stops each', () => {
    expect(SKIES.map((s) => s.id)).toEqual(['daylight', 'ember', 'tide', 'graphite'])
    for (const sky of SKIES) {
      expect(sky.hours).toHaveLength(24)
      for (const hex of sky.hours) expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
  it('daylight is free and the default', () => {
    expect(getSky(DEFAULT_SKY_ID).price).toBe(0)
    expect(getSky('missing').id).toBe('daylight')
  })
  it('hourHue wraps hours and matches DESIGN.md stops', () => {
    const sky = getSky('daylight')
    expect(hourHue(sky, 24)).toBe('#4C4FA6')
    expect(hourHue(sky, -1)).toBe('#5652A9')
    expect(hourHue(sky, 12)).toBe('#E8B93F')
    expect(hourHue(sky, 19)).toBe('#D2687A')
    expect(hourHue(getSky('ember'), 12)).toBe('#F0CB7A')
    expect(hourHue(getSky('tide'), 12)).toBe('#BFE3D6')
  })
  it('graphite lights the section with the Daylight stop but tints with its own greys', () => {
    const graphite = getSky('graphite')
    expect(hourHue(graphite, 10)).toBe('#9EA5B1')
    expect(litHue(graphite, 10)).toBe('#5EA3DC')
    expect(litHue(getSky('tide'), 10)).toBe('#98D5C6')
  })
  it('lapStops picks the AM or PM lap', () => {
    const sky = getSky('daylight')
    expect(lapStops(sky, 9)).toEqual(sky.hours.slice(0, 12))
    expect(lapStops(sky, 19)).toEqual(sky.hours.slice(12))
    expect(lapStops(sky, 19)[7]).toBe('#D2687A')
  })
})

describe('dials', () => {
  it('has five dials, sector free and default', () => {
    expect(DIALS.map((d) => d.id)).toEqual(['sector', 'hairline', 'rays', 'lantern', 'orbit'])
    expect(getDial(DEFAULT_DIAL_ID).price).toBe(0)
    expect(isDialId('orbit')).toBe(true)
    expect(isDialId('bogus')).toBe(false)
  })
})

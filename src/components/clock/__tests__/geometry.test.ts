import { describe, expect, it } from 'vitest'
import { arcPath, continuousSecondDeg, haloOrigin, handAngles, polar, sectionAngles, sectionForHour, strokeArcPath } from '../geometry'

describe('polar', () => {
  it('measures clockwise from 12 o’clock', () => {
    expect(polar(200, 200, 100, 0)).toEqual({ x: 200, y: 100 })
    expect(polar(200, 200, 100, 90)).toEqual({ x: 300, y: 200 })
    expect(polar(200, 200, 100, 180)).toEqual({ x: 200, y: 300 })
    expect(polar(200, 200, 100, 270)).toEqual({ x: 100, y: 200 })
  })
})

describe('arcPath', () => {
  it('draws an annular sector with outer arc, inner arc and close', () => {
    const d = arcPath(200, 200, 100, 50, 0, 90)
    expect(d).toBe('M 200 100 A 100 100 0 0 1 300 200 L 250 200 A 50 50 0 0 0 200 150 Z')
  })
  it('uses the large-arc flag above 180 degrees', () => {
    expect(arcPath(200, 200, 100, 50, 0, 270)).toContain('A 100 100 0 1 1')
    expect(arcPath(200, 200, 100, 50, 0, 180)).toContain('A 100 100 0 0 1')
  })
  it('draws a wedge from the center when the inner radius is zero', () => {
    const d = arcPath(200, 200, 100, 0, 0, 30)
    expect(d.startsWith('M 200 200 L 200 100 A 100 100 0 0 1 ')).toBe(true)
    expect(d.endsWith(' Z')).toBe(true)
  })
  it('strokeArcPath is an open arc', () => {
    expect(strokeArcPath(200, 200, 100, 0, 90)).toBe('M 200 100 A 100 100 0 0 1 300 200')
  })
})

describe('sections', () => {
  it('splits the ring into 30-degree sections with an optional gap', () => {
    expect(sectionAngles(0)).toEqual({ start: 0, end: 30, mid: 15 })
    expect(sectionAngles(3, 2)).toEqual({ start: 92, end: 118, mid: 105 })
  })
  it('maps 24-hour hours onto 12 sections', () => {
    expect(sectionForHour(0)).toBe(0)
    expect(sectionForHour(12)).toBe(0)
    expect(sectionForHour(15)).toBe(3)
    expect(sectionForHour(23)).toBe(11)
  })
})

describe('handAngles', () => {
  it('computes hour, minute and second angles', () => {
    const a = handAngles(new Date(2026, 0, 1, 15, 30, 15, 500), false)
    expect(a.hour).toBeCloseTo(105.125, 3) // 3h + 30.25min
    expect(a.minute).toBeCloseTo(181.5, 3)
    expect(a.second).toBe(90)
  })
  it('includes milliseconds only when sweeping', () => {
    const d = new Date(2026, 0, 1, 0, 0, 15, 500)
    expect(handAngles(d, true).second).toBe(93)
    expect(handAngles(d, false).second).toBe(90)
  })
})

describe('haloOrigin', () => {
  it('matches the mockup for 19:42 and 10:14', () => {
    expect(haloOrigin(19).x).toBeCloseTo(38.69, 2)
    expect(haloOrigin(19).y).toBeCloseTo(61.31, 2)
    expect(haloOrigin(10).x).toBeCloseTo(38.69, 2)
    expect(haloOrigin(10).y).toBeCloseTo(38.69, 2)
  })
  it('puts the light at the top for the first hour of a lap', () => {
    const { x, y } = haloOrigin(0)
    expect(x).toBeCloseTo(54.14, 2)
    expect(y).toBeCloseTo(34.55, 2)
  })
})

describe('continuousSecondDeg', () => {
  it('never decreases across a minute boundary', () => {
    const a = continuousSecondDeg(new Date(2026, 0, 1, 10, 0, 59), false)
    const b = continuousSecondDeg(new Date(2026, 0, 1, 10, 1, 0), false)
    expect(b - a).toBe(6)
    expect(a % 360).toBe(354)
  })
  it('includes milliseconds only when sweeping', () => {
    const d = new Date(2026, 0, 1, 0, 0, 15, 500)
    expect(continuousSecondDeg(d, true)).toBe(93)
    expect(continuousSecondDeg(d, false)).toBe(90)
  })
})

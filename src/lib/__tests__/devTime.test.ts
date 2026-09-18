import { describe, expect, it } from 'vitest'
import { devTimeOffset, overrideOffsetMs, parseAt } from '../devTime'

describe('parseAt', () => {
  it('parses HH:MM and H:MM', () => {
    expect(parseAt('?at=19:42')).toEqual({ hour: 19, minute: 42 })
    expect(parseAt('?foo=1&at=7:05')).toEqual({ hour: 7, minute: 5 })
    expect(parseAt('?at=00:00')).toEqual({ hour: 0, minute: 0 })
  })
  it('rejects missing or malformed values', () => {
    expect(parseAt('')).toBeNull()
    expect(parseAt('?at=')).toBeNull()
    expect(parseAt('?at=24:00')).toBeNull()
    expect(parseAt('?at=12:60')).toBeNull()
    expect(parseAt('?at=noon')).toBeNull()
    expect(parseAt('?at=1942')).toBeNull()
    expect(parseAt('?at=9:5')).toBeNull()
  })
})

describe('overrideOffsetMs', () => {
  it('shifts the real clock to the pinned time today, keeping the sub-second phase', () => {
    const real = new Date(2026, 8, 17, 8, 30, 12, 345).getTime()
    const offset = overrideOffsetMs({ hour: 19, minute: 42 }, real)
    const shifted = new Date(real + offset)
    expect(shifted.getHours()).toBe(19)
    expect(shifted.getMinutes()).toBe(42)
    expect(shifted.getSeconds()).toBe(0)
    expect(shifted.getMilliseconds()).toBe(345)
    expect(shifted.getDate()).toBe(17)
  })
  it('advances seconds from :00 as real time passes', () => {
    const real = new Date(2026, 8, 17, 8, 30, 12, 0).getTime()
    const offset = overrideOffsetMs({ hour: 10, minute: 14 }, real)
    const later = new Date(real + 61_000 + offset)
    expect(later.getHours()).toBe(10)
    expect(later.getMinutes()).toBe(15)
    expect(later.getSeconds()).toBe(1)
  })
})

describe('devTimeOffset', () => {
  it('is 0 without ?at= in the URL', () => {
    expect(devTimeOffset()).toBe(0)
  })
})
